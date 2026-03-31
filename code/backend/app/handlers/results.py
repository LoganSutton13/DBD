"""Results business logic: task summary, list, and task artifact readers."""

import json
from pathlib import Path
from typing import Any, List, Optional

from app.schemas.results import (
    DisplayPathPoint,
    DisplayPathResponse,
    RobotPathRawPoint,
    RobotPathRawResponse,
    TaskResultItem,
    TaskSummaryResponse,
)
from app.services.file_storage import FileStorageService

DEFAULT_ROBOT_FRAME = "robot_relative"
DEFAULT_DISPLAY_FRAME = "map_display"
DISPLAY_CRS = "EPSG:4326"
DISPLAY_UNITS = "degrees"


def _read_json_file(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    if not isinstance(payload, dict):
        raise ValueError(f"Invalid JSON object in {path}")
    return payload


def _read_robot_metadata(storage: FileStorageService, task_id: str) -> dict[str, Any]:
    metadata_path = storage.get_robot_path_metadata_path(task_id)
    if not metadata_path:
        return {}
    try:
        return _read_json_file(metadata_path)
    except Exception:
        return {}


def _read_raw_track_waypoints(track_path: Path) -> list[RobotPathRawPoint]:
    payload = _read_json_file(track_path)
    raw_track_waypoints = payload.get("waypoints", [])
    points: list[RobotPathRawPoint] = []
    if not isinstance(raw_track_waypoints, list):
        return points
    for point in raw_track_waypoints:
        if not isinstance(point, dict):
            continue
        translation = point.get("aFromB", {}).get("translation", {})
        x = translation.get("x")
        y = translation.get("y")
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            points.append(RobotPathRawPoint(x=float(x), y=float(y)))
    return points


def get_task_summary(
    task_id: str,
    storage: FileStorageService,
    base_url: str,
) -> TaskSummaryResponse:
    """Summary for a processed task with orthophoto and report URLs."""
    image_path = storage.get_image_path(task_id)
    report_path = storage.get_report_path(task_id)
    if not image_path and not report_path:
        raise FileNotFoundError("No results found for task")
    base_url = base_url.rstrip("/")
    result = TaskSummaryResponse(taskId=task_id)
    if image_path:
        result.orthophotoPngUrl = f"{base_url}/api/v1/results/{task_id}/orthophoto.png"
    if report_path:
        result.reportPdfUrl = f"{base_url}/api/v1/results/{task_id}/report.pdf"
    if storage.get_robot_path_path(task_id):
        result.robotPathUrl = f"{base_url}/api/v1/results/{task_id}/robot-path"
    if storage.get_display_path_path(task_id):
        result.displayPathUrl = f"{base_url}/api/v1/results/{task_id}/display-path"
    return result


def list_processed_files(storage: FileStorageService) -> List[TaskResultItem]:
    """List all tasks that have an orthophoto PNG."""
    raw = storage.list_tasks_with_orthophoto()
    return [
        TaskResultItem(
            taskId=item["taskId"],
            orthophotoPngUrl=item["orthophotoPngUrl"],
            reportPdfUrl=item["reportPdfUrl"],
            taskName=item.get("taskName"),
            robotPathUrl=f"/api/v1/results/{item['taskId']}/robot-path"
            if storage.get_robot_path_path(item["taskId"])
            else None,
            displayPathUrl=f"/api/v1/results/{item['taskId']}/display-path"
            if storage.get_display_path_path(item["taskId"])
            else None,
        )
        for item in raw
    ]


def get_orthophoto_path(task_id: str, storage: FileStorageService) -> Optional[Path]:
    """Return local path to orthophoto PNG, or None if not found."""
    return storage.get_image_path(task_id)


def get_report_path(task_id: str, storage: FileStorageService) -> Optional[Path]:
    """Return local path to report PDF, or None if not found."""
    return storage.get_report_path(task_id)


def get_robot_path(task_id: str, storage: FileStorageService) -> RobotPathRawResponse:
    """Return robot-native path coordinates for a task."""
    track_path = storage.get_robot_path_path(task_id)
    if not track_path:
        raise FileNotFoundError("Robot path not found")
    metadata = _read_robot_metadata(storage, task_id)
    waypoints = _read_raw_track_waypoints(track_path)
    return RobotPathRawResponse(
        taskId=task_id,
        frame=str(metadata.get("robot_frame", DEFAULT_ROBOT_FRAME)),
        crs=str(metadata.get("robot_crs", "unknown")),
        units=str(metadata.get("robot_units", "unknown")),
        waypoints=waypoints,
    )


def get_display_path(task_id: str, storage: FileStorageService) -> DisplayPathResponse:
    """Return display-safe geographic path coordinates for map overlays."""
    display_path = storage.get_display_path_path(task_id)
    metadata = _read_robot_metadata(storage, task_id)
    waypoints: list[DisplayPathPoint] = []
    if display_path:
        payload = _read_json_file(display_path)
        features = payload.get("features", [])
        if isinstance(features, list) and features:
            geometry = features[0].get("geometry", {})
            coordinates = geometry.get("coordinates", [])
            if isinstance(coordinates, list):
                for coord in coordinates:
                    if not isinstance(coord, list) or len(coord) < 2:
                        continue
                    lon, lat = coord[0], coord[1]
                    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                        waypoints.append(DisplayPathPoint(lat=float(lat), lon=float(lon)))
    if not waypoints:
        # Backward-compatible fallback for legacy tasks that only have geographic robot_path.json.
        track_path = storage.get_robot_path_path(task_id)
        if not track_path:
            raise FileNotFoundError("Display path not found")
        raw_points = _read_raw_track_waypoints(track_path)
        for point in raw_points:
            if -180 <= point.x <= 180 and -90 <= point.y <= 90:
                waypoints.append(DisplayPathPoint(lat=point.y, lon=point.x))
        if not waypoints:
            raise FileNotFoundError("Display path not found")

    return DisplayPathResponse(
        taskId=task_id,
        frame=str(metadata.get("display_frame", DEFAULT_DISPLAY_FRAME)),
        crs=str(metadata.get("display_crs", DISPLAY_CRS)),
        units=str(metadata.get("display_units", DISPLAY_UNITS)),
        waypoints=waypoints,
    )
