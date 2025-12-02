from __future__ import annotations
from pathlib import Path
import json
import argparse
import asyncio
from math import radians
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from farm_ng.core.event_client import EventClient
from farm_ng.core.event_service_pb2 import EventServiceConfig
from farm_ng.core.events_file_reader import proto_from_json_file
from farm_ng.filter.filter_pb2 import FilterState
from farm_ng.track.track_pb2 import Track
from farm_ng_core_pybind import Isometry3F64
from farm_ng_core_pybind import Pose3F64
from farm_ng_core_pybind import Rotation3F64
from google.protobuf.empty_pb2 import Empty
from track_planner import TrackBuilder

matplotlib.use("TkAgg")  # Set the backend to Agg for non-GUI environments
def extract_geojson_points(geojson_data):
    """
    Extract all ENU points from a GeoJSON-like dict (output of load_geojson).
    Returns two lists: x (eastings), y (northings).
    """
    x_points = []
    y_points = []
    for feature in geojson_data.get('features', []):
        geometry = feature.get('geometry', {})
        coords = geometry.get('coordinates', [])
        if geometry.get('type') == 'Polygon':
            for ring in coords:
                for pt in ring:
                    if len(pt) >= 2:
                        x_points.append(pt[0])
                        y_points.append(pt[1])
        elif geometry.get('type') == 'LineString':
            for pt in coords:
                if len(pt) >= 2:
                    x_points.append(pt[0])
                    y_points.append(pt[1])
        elif geometry.get('type') == 'Point':
            if len(coords) >= 2:
                x_points.append(coords[0])
                y_points.append(coords[1])
    return x_points, y_points

# Create a helper functions to print data
def plot_track(waypoints: list[list[float]]) -> None:
    x = waypoints[0]
    y = waypoints[1]
    headings = waypoints[2]

    # Calculate the arrow directions
    U = np.cos(headings)
    V = np.sin(headings)

    # Parameters for arrow plotting
    arrow_interval = 20  # Adjust this to change the frequency of arrows
    turn_threshold = np.radians(10)  # Threshold in radians for when to skip plotting


    plt.figure(figsize=(8, 8))
    plt.plot(x, y, color='orange', linewidth=1.0)
    plt.scatter(x, y, color='green', s=20, label='Waypoints')  # Plot individual waypoints

    for i in range(0, len(x), arrow_interval):
        # Calculate the heading change
        if i > 0:
            heading_change = np.abs(headings[i] - headings[i - 1])
        else:
            heading_change = 0

        # Plot the arrow if the heading change is below the threshold
        if heading_change < turn_threshold:
            plt.quiver(x[i], y[i], U[i], V[i], angles='xy', scale_units='xy', scale=3.5, color='blue')

    plt.plot(x[0], y[0], marker="o", markersize=5, color='red')
    plt.axis("equal")
    legend_elements = [
        plt.Line2D([0], [0], color='orange', lw=2, label='Track'),
        plt.Line2D([0], [0], color='blue', lw=2, label='Heading'),
        plt.Line2D([0], [0], color='green', marker='o', linestyle='', markersize=8, label='Waypoints'),
        plt.Line2D([0], [0], color='red', marker='o', linestyle='', markersize=8, label='Start'),
    ]
    plt.legend(handles=legend_elements)
    plt.show()


async def create_start_pose(client: EventClient | None = None, timeout: float = 0.5) -> Pose3F64:
    """Create a start pose for the track.

    Args:
        client: A EventClient for the required service (filter)
    Returns:
        The start pose (Pose3F64)
    """
    print("Creating start pose...")

    zero_tangent = np.zeros((6, 1), dtype=np.float64)
    start: Pose3F64 = Pose3F64(
        a_from_b=Isometry3F64(), frame_a="world", frame_b="robot", tangent_of_b_in_a=zero_tangent
    )
    if client is not None:
        try:
            # Get the current state of the filter
            state: FilterState = await asyncio.wait_for(
                client.request_reply("/get_state", Empty(), decode=True), timeout=timeout
            )
            start = Pose3F64.from_proto(state.pose)
        except asyncio.TimeoutError:
            print("Timeout while getting filter state. Using default start pose.")
        except Exception as e:
            print(f"Error getting filter state: {e}. Using default start pose.")

    return start

    # Drive forward 32 ft (up 1)
    track_builder.create_straight_segment(next_frame_b="goal5", distance=row_length, spacing=0.1)

    # Maneuver at the end of row: skip one row (96 inches) - (go from 1 to 3)
    track_builder.create_arc_segment(next_frame_b="goal6", radius=row_spacing, angle=radians(180), spacing=0.1)

    # Drive forward 32 ft (down 3)
    track_builder.create_straight_segment(next_frame_b="goal7", distance=row_length, spacing=0.1)

    # Maneuver at the end of row: skip one row (96 inches) - (go from 3 to 1)
    track_builder.create_arc_segment(next_frame_b="goal8", radius=row_spacing, angle=radians(180), spacing=0.1)

    # Drive forward 32 ft (up 1)
    track_builder.create_straight_segment(next_frame_b="goal9", distance=row_length, spacing=0.1)

    # Maneuver at the end of row: skip two rows (144 inches) - (go from 1 to 4)
    track_builder.create_arc_segment(next_frame_b="goal10", radius=1.5 * row_spacing, angle=radians(180), spacing=0.1)

    # Drive forward 32 ft (down 4)
    track_builder.create_straight_segment(next_frame_b="goal11", distance=row_length, spacing=0.1)

    # Maneuver at the end of row: skip one row (96 inches) - (go from 4 to 2 - slightly before the start)
    track_builder.create_arc_segment(next_frame_b="goal12", radius=row_spacing, angle=radians(175), spacing=0.1)

    if reverse:
        track_builder.reverse_track()

    # Print the number of waypoints in the track
    print(f" Track created with {len(track_builder.track_waypoints)} waypoints")

    # Save the track to a file
    if save_track is not None:
        track_builder.save_track(save_track)

    # Plot the track
    waypoints = track_builder.unpack_track()
    plot_track(waypoints)
    return track_builder.track


async def run(args) -> None:
    # Create flag for saving track
    save_track: bool = args.save_track
    reverse: bool = args.reverse

    client: EventClient | None = None

    if args.service_config is not None:
        client = EventClient(proto_from_json_file(args.service_config, EventServiceConfig()))
        if client is None:
            raise RuntimeError(f"No filter service config in {args.service_config}")
        if client.config.name != "filter":
            raise RuntimeError(f"Expected filter service in {args.service_config}, got {client.config.name}")

    # Start the asyncio tasks
    tasks: list[asyncio.Task] = [asyncio.create_task(build_track(reverse, client, save_track))]
    await asyncio.gather(*tasks)


'''if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="python main.py", description="Amiga path planning example.")
    parser.add_argument("--save-track", type=Path, help="Save the track to a file.")
    parser.add_argument("--reverse", action='store_true', help="Reverse the track.")
    parser.add_argument("--service-config", type=Path, help="Path to the service config file.")
    args = parser.parse_args()

    # Create the asyncio event loop and run the main function
    loop = asyncio.get_event_loop()
    loop.run_until_complete(run(args))'''


def load_geojson(file_path, rtk_base_station=(0, 0, 0)):
    """
    Load a GeoJSON file and convert its lat/lon coordinates into ENU coordinates.
    The conversion is done relative to a RTK base station reference point (lon, lat, alt).
    Returns a dict with the same structure as the input GeoJSON, but with coordinates in ENU.
    """
    from pyproj import Transformer

    # Accept rtk_base_station as (lon, lat, alt) or (lon, lat)
    base_lon, base_lat = rtk_base_station[:2]
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Set up transformer: WGS84 to local ENU (tmerc centered at base)
    # set rtk_base_station to first converted point
    transformer = Transformer.from_crs(
        crs_from="epsg:4326",
        crs_to=f"+proj=tmerc +lat_0={base_lat} +lon_0={base_lon} +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
        always_xy=True,
    )

    def convert_coords(coords):
        # Recursively convert all coordinates in the structure
        if isinstance(coords[0], (float, int)):
            # Single point [lon, lat]
            e, n = transformer.transform(coords[0], coords[1])
            return [e, n]
        else:
            return [convert_coords(c) for c in coords]

    # Deep copy and convert all geometry coordinates
    result = {k: v for k, v in data.items() if k != 'features'}
    result['features'] = []
    for feature in data['features']:
        new_feature = {k: v for k, v in feature.items() if k != 'geometry'}
        geom = feature['geometry']
        new_geom = dict(geom)
        new_geom['coordinates'] = convert_coords(geom['coordinates'])
        new_feature['geometry'] = new_geom
        result['features'].append(new_feature)
    return result


def build_track(results):
    """
    Build a FarmNG Track from the given results.
    Utilize the track obejct to store waypoints.
    """
    # starting_coordinates = Waypoint: E=-4498828.451642927, N=12559702.791498322
    # we want to use the above as the starting point for the track
    start = Pose3F64(
        a_from_b=Isometry3F64(
            translation=np.array([[-4498828.451642927], [12559702.791498322], [0.0]]), rotation=Rotation3F64(np.eye(3))
        ),
        frame_a="world",
        frame_b="robot",
    )
    track_builder = TrackBuilder(start=start)
    track = Track()
    count = 0
    reverse = True
    for feature in results.get('features', []):
        geometry = feature.get('geometry', {})
        if geometry.get('type') == 'Polygon':
            # GeoJSON Polygons: coordinates is a list of linear rings (first is outer, others are holes)
            for ring in geometry.get('coordinates', []):
                # just need to add a representative from the ring to the track
                representative_coord = ring[0 if reverse else -1]
                if len(representative_coord) < 2:
                    continue
                e, n = representative_coord[:2]
                pose = Pose3F64(
                    a_from_b=Isometry3F64(translation=np.array([[e], [n], [0.0]]), rotation=Rotation3F64(np.eye(3))),
                    frame_a="world",
                    frame_b="robot",
                )
                track_builder.create_ab_segment(f"pose {count}", pose, spacing=4.0)
                track.waypoints.append(pose.to_proto())
                count += 1
                continue
                for coord in ring:
                    if len(coord) < 2:
                        continue
                    e, n = coord[:2]
                    pose = Pose3F64(
                        a_from_b=Isometry3F64(
                            translation=np.array([[e], [n], [0.0]]), rotation=Rotation3F64(np.eye(3))
                        ),
                        frame_a="world",
                        frame_b="robot",
                    )
                    track_builder.create_ab_segment(f"pose {count}", pose, spacing=4.0)
                    track.waypoints.append(pose.to_proto())
                    count += 1
            reverse = not reverse
    return track_builder


async def test():
    geojson_data = load_geojson(Path(__file__).parent / 'field_ndvi_python.geojson')
    print(build_track(geojson_data))
    track_builder = build_track(geojson_data)
    waypoints = track_builder.unpack_track()
    print(len(waypoints[0]))
    # Plot the track as before
    plot_track(waypoints)
    # Extract and plot raw ENU points from geojson
    x_raw, y_raw = extract_geojson_points(geojson_data)
    plt.scatter(x_raw, y_raw, color='black', s=10, label='Raw ENU Points', alpha=0.7)
    plt.legend()
    plt.show()
    return
    start = await create_start_pose()
    track_builder = TrackBuilder(start)
    track_builder.load_track()
    track_builder.track = track
    waypoints = track_builder.unpack_track()
    print(len(waypoints[0]))
    plot_track(waypoints)


if __name__ == "__main__":
    asyncio.run(test())
