import asyncio
import csv
import math
from pathlib import Path
import geopandas as gpd
import fields2cover as f2c
from farm_ng.core.event_client import EventClient
from farm_ng.core.event_service_pb2 import EventServiceConfig
from farm_ng.core.events_file_reader import proto_from_json_file
from farm_ng.filter.filter_pb2 import FilterState
from farm_ng.track.track_pb2 import Track
from farm_ng_core_pybind import Isometry3F64
from farm_ng_core_pybind import Pose3F64
from farm_ng_core_pybind import Rotation3F64
from google.protobuf.empty_pb2 import Empty
import numpy as np
from track_planner import TrackBuilder
import matplotlib.pyplot as plt

class PathPoint:
        def __init__(self, lon, lat, *args):
            self.lon = float(lon)
            self.lat = float(lat)
            self.extra = tuple(float(a) for a in args)
        def __repr__(self):
            return f"PathPoint(lon={self.lon}, lat={self.lat}, extra={self.extra})"
        
class PathGenerator:
    """Class to generate a boustrophedon path from a shapefile and convert it to FarmNG track format."""
    def __init__(self, pid: int, shapefile_path: Path, farmng_track_file: Path):
        """
        Docstring for __init__
        
        :param self: Instance of the class
        :param shapefile_path: path to the shapefile
        :type shapefile_path: Path
        :param farmng_track_file: path to the desired output. Must end with .json
        :type farmng_track_file: Path
        """
        self.shapefile_path = shapefile_path
        self.output_path_file = f"localdata/path_{pid}.csv"
        self.farmng_track_file = farmng_track_file
        self.waypoints = None

    def generate_path(self):
        """
        Generate a boustrophedon path from the shapefile and save it to CSV utilizing Fields2Cover.
        
        :param self: Instance of the class
        """
        gdf = gpd.read_file(self.shapefile_path)
        
        # --- 1) Extract a polygon boundary (largest if MultiPolygon) ---
        geom = gdf.geometry.iloc[0]
        if geom.geom_type == "Polygon":
            poly = geom
        elif geom.geom_type == "MultiPolygon":
            poly = max(geom.geoms, key=lambda p: p.area)
        else:
            raise ValueError(f"Unsupported geometry type: {geom.geom_type}")

        boundary_coords = list(poly.exterior.coords)

        # Ensure ring is closed (last point == first point)
        if boundary_coords[0] != boundary_coords[-1]:
            boundary_coords.append(boundary_coords[0])

        # --- 2) Build Fields2Cover geometry: LinearRing -> Cell -> Cells -> Field ---
        outer_ring = f2c.LinearRing()
        for x, y in boundary_coords:
            outer_ring.addPoint(f2c.Point(float(x), float(y)))

        cell = f2c.Cell()
        cell.addRing(outer_ring)

        cells = f2c.Cells()
        cells.addGeometry(cell)

        field = f2c.Field()
        field.setField(cells)  # canonical construction in python tests

        # --- 3) Handle CRS (highly recommended) ---
        # If your shapefile CRS is geographic (degrees), convert to UTM for metric planning.
        # Fields2Cover can transform to UTM if Field has an EPSG coord system set.
        if gdf.crs is not None:
            epsg = gdf.crs.to_epsg()
            if epsg is not None:
                field.setEPSGCoordSystem(int(epsg))
                # Convert to UTM if not already UTM-ish
                # (This mirrors the official tutorial flow.)
                f2c.Transform.transformToUTM(field)

        # After potential transform, always re-grab the field cells from the Field object
        cells = field.getField()

        # --- 4) Headlands ---
        robot = f2c.Robot(2.0, 6.0)   # (width, cov_width) per tutorials

        const_hl = f2c.HG_Const_gen()
        no_hl = const_hl.generateHeadlands(cells, 3.0 * robot.getWidth())

        # --- 5) Swaths (boustrophedon) ---
        bf = f2c.SG_BruteForce()
        angle = math.pi  # choose your desired heading in radians
        swaths = bf.generateSwaths(angle, robot.getCovWidth(), no_hl.getGeometry(0))

        boustro = f2c.RP_Boustrophedon()
        swaths = boustro.genSortedSwaths(swaths)

        # --- 6) Path planning ---
        path_planner = f2c.PP_PathPlanning()
        dubins = f2c.PP_DubinsCurves()
        path_local = path_planner.planPath(robot, swaths, dubins)

        # If we did a CRS transform to UTM, you often want the path back in the original CRS:
        # (If Field has a prev CRS stored, this will output in that CRS.)
        try:
            path_out = f2c.Transform.transformToPrevCRS(path_local, field)
        except Exception:
            path_out = path_local

        path_out.saveToFile(str(self.output_path_file), 15)
        return True
    
    def convert_path_to_farmng(self):
        """
        Convert the generated path CSV to FarmNG track format and save to JSON.
        
        :param self: Instance of the class
        Returns:
            Path to the saved FarmNG track JSON file.
            Also accessible via self.farmng_track_file
        """
        path_points = self._load_path_points(self.output_path_file)
        track_builder : TrackBuilder =self._build_track(path_points)
        waypoints = track_builder.unpack_track()
        track_builder.save_track(self.farmng_track_file)
        self.waypoints = waypoints
        return self.farmng_track_file
    
    def _load_path_points(self, csv_path):
        points = []
        with open(csv_path, newline='') as csvfile:
            reader = csv.reader(csvfile, delimiter=' ', skipinitialspace=True)
            for row in reader:
                if not row or row[0].startswith('#'):
                    continue
                points.append(PathPoint(*row))
        return points

    def _build_track(self, path_points : list[PathPoint]) -> Track:
        start = Pose3F64(
            a_from_b=Isometry3F64(
                translation=np.array([path_points[0].lon, path_points[0].lat, 0.0])
            ),
            frame_a="world",
            frame_b="robot",
        )
        track_builder = TrackBuilder(start)
        track = Track()
        count = 0
        
        # iterate over the points and create poses
        for pt in path_points:
            pose = Pose3F64(
                a_from_b=Isometry3F64(
                    translation=np.array([pt.lon, pt.lat, 0.0])
                ),
                frame_a="world",
                frame_b="robot",
            )
            track_builder.create_ab_segment(f"pose {count}", pose, spacing = 1.0)
            track.waypoints.append(pose.to_proto())
            count += 1
            
        return track_builder
    
    def plot_track(self) -> None:
        """Plot the track waypoints"""
        if self.waypoints is None:
            raise ValueError("Waypoints not loaded. Please run convert_path_to_farmng() first.")
        x = self.waypoints[0]
        y = self.waypoints[1]
        headings = self.waypoints[2]

        # Calculate the arrow directions
        U = np.cos(headings)
        V = np.sin(headings)

        # Parameters for arrow plotting
        arrow_interval = 20  # Adjust this to change the frequency of arrows
        turn_threshold = np.radians(10)  # Threshold in radians for when to skip plotting


        plt.figure(figsize=(8, 8))
        plt.plot(x, y, color='orange', linewidth=0.5)
        plt.scatter(x, y, color='green', s=0.5, label='Waypoints')  # Plot individual waypoints
        plt.title('Boustrophedon Path')
        plt.xlabel('Longitude')
        plt.ylabel('Latitude')
        plt.axis('equal')
        plt.grid(True)
        plt.show()
