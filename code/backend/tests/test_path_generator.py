import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import os
import unittest
from pathlib import Path
from unittest.mock import MagicMock

# fields2cover requires manual installation from source; mock it so unit tests
# that don't exercise generate_path() can still import PathGenerator.
if 'fields2cover' not in sys.modules:
    sys.modules['fields2cover'] = MagicMock()

from app.services.path_planning_module.path_generator import PathGenerator

class TestPathGenerator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Set up paths for test files
        cls.test_shapefile = Path(os.path.dirname(__file__)) / "test_data" / "boundaries.shp"
        cls.output_csv = Path(os.path.dirname(__file__)) / "test_data" / "test_path.csv"
        cls.output_json = Path(os.path.dirname(__file__)) / "test_data" / "test_track.json"

    def setUp(self):
        # Clean up output files before each test
        if self.output_csv.exists():
            self.output_csv.unlink()
        if self.output_json.exists():
            self.output_json.unlink()

    def test_generate_path_and_convert(self):
        # Ensure the test shapefile exists
        self.assertTrue(self.test_shapefile.exists(), "Test shapefile is missing. Please add it to tests/test_data/test_field.geojson.")
        
        # Instantiate and run PathGenerator
        generator = PathGenerator(
            pid=1,
            shapefile_path=self.test_shapefile,
            farmng_track_file=self.output_json,
            csv_output_path=self.output_csv,
            heading = 90.0,
            robot_width = 2.0,
            coverage_width = 6.0
        )
        result = generator.generate_path()
        self.assertTrue(result, "Path generation failed.")
        self.assertTrue(self.output_csv.exists(), "Output CSV was not created.")

        # Convert to FarmNG format
        track_file = generator.convert_path_to_farmng()
        self.assertTrue(self.output_json.exists(), "FarmNG track JSON was not created.")
        self.assertEqual(track_file, self.output_json)

class TestConvertPathToFarmngWithBaseStation(unittest.TestCase):
    """Tests for convert_path_to_farmng with a base_station_coords set."""

    @classmethod
    def setUpClass(cls):
        cls.test_csv = Path(os.path.dirname(__file__)) / "test_data" / "test_path.csv"
        cls.output_json = Path(os.path.dirname(__file__)) / "test_data" / "test_track_relative.json"
        # Base station near the test field (lon, lat) in Missoula, MT area
        cls.base_station_coords = (-117.047, 47.036)

    def tearDown(self):
        if self.output_json.exists():
            self.output_json.unlink()

    def test_saved_track_uses_relative_coordinates(self):
        """Saved track JSON should contain relative easting/northing offsets from the base station."""
        generator = PathGenerator(
            pid=1,
            shapefile_path=Path(os.path.dirname(__file__)) / "test_data" / "boundaries.shp",
            farmng_track_file=self.output_json,
            csv_output_path=self.test_csv,
            heading=90.0,
            robot_width=2.0,
            coverage_width=6.0,
            base_station_coords=self.base_station_coords,
        )
        generator.convert_path_to_farmng()

        self.assertTrue(self.output_json.exists(), "Relative track JSON was not created.")

        # Load the saved track and inspect its waypoint translations
        from farm_ng.core.events_file_reader import proto_from_json_file
        from farm_ng.track.track_pb2 import Track

        loaded_track = proto_from_json_file(self.output_json, Track())
        self.assertGreater(len(loaded_track.waypoints), 0, "Saved track has no waypoints.")

        for wp in loaded_track.waypoints:
            tx = wp.a_from_b.translation.x  # relative easting
            ty = wp.a_from_b.translation.y  # relative northing
            # Relative offsets for this small field must be well within ±10 km
            self.assertLess(abs(tx), 10_000,
                            f"Saved track x={tx} looks like a longitude, not relative easting.")
            self.assertLess(abs(ty), 10_000,
                            f"Saved track y={ty} looks like a latitude, not relative northing.")
            # Values must not be unmodified longitudes (~-117)
            self.assertGreater(tx, -200,
                               f"Saved track x={tx} appears to be a raw longitude.")

    def test_preview_waypoints_use_lon_lat(self):
        """self.waypoints should stay in lon/lat so the frontend map preview is correct."""
        generator = PathGenerator(
            pid=1,
            shapefile_path=Path(os.path.dirname(__file__)) / "test_data" / "boundaries.shp",
            farmng_track_file=self.output_json,
            csv_output_path=self.test_csv,
            heading=90.0,
            robot_width=2.0,
            coverage_width=6.0,
            base_station_coords=self.base_station_coords,
        )
        generator.convert_path_to_farmng()

        self.assertIsNotNone(generator.waypoints, "Waypoints should be set after conversion.")
        preview_x, preview_y, _ = generator.waypoints
        self.assertGreater(len(preview_x), 0, "Preview waypoints list is empty.")

        # The test field is in western Montana: lon ~-117, lat ~47
        for x in preview_x:
            self.assertLess(x, -100,
                            f"Preview x={x} should be a longitude (~-117), not relative easting.")
        for y in preview_y:
            self.assertGreater(y, 40,
                               f"Preview y={y} should be a latitude (~47), not relative northing.")


if __name__ == "__main__":
    unittest.main()
