"""Results business logic: task summary, list, and task artifact readers."""

import json
from pathlib import Path
from typing import List, Optional

from app.schemas.results import RobotPathPoint, RobotPathResponse, TaskResultItem, TaskSummaryResponse
from app.services.file_storage import FileStorageService


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
        )
        for item in raw
    ]


def get_orthophoto_path(task_id: str, storage: FileStorageService) -> Optional[Path]:
    """Return local path to orthophoto PNG, or None if not found."""
    return storage.get_image_path(task_id)


def get_report_path(task_id: str, storage: FileStorageService) -> Optional[Path]:
    """Return local path to report PDF, or None if not found."""
    return storage.get_report_path(task_id)


def get_robot_path(task_id: str, storage: FileStorageService) -> RobotPathResponse:
    """Return stored robot path (waypoints) for a task from robot_path.json."""
    waypoints: List[RobotPathPoint] = []
    track_path = storage.get_robot_path_path(task_id)
    if not track_path:
        raise FileNotFoundError("Robot path not found")
    with open(track_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    raw_track_waypoints = payload.get("waypoints", [])
    if isinstance(raw_track_waypoints, list):
        for point in raw_track_waypoints:
            if not isinstance(point, dict):
                continue
            translation = point.get("aFromB", {}).get("translation", {})
            lon = translation.get("x")
            lat = translation.get("y")
            if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                waypoints.append(RobotPathPoint(lat=float(lat), lon=float(lon)))

    return RobotPathResponse(taskId=task_id, waypoints=waypoints)
