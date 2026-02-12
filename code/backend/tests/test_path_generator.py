import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import os
import unittest
from pathlib import Path
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

if __name__ == "__main__":
    unittest.main()
