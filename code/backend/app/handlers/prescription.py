"""Prescription business logic: get, update, list prescription GeoJSON."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.schemas.prescription import (
    PrescriptionListItem,
    PrescriptionListResponse,
    PrescriptionStatusResponse,
    PrescriptionUpdateRequest,
)
from app.schemas.prescription_config import PrescriptionConfig
from app.services.file_storage import FileStorageService


def get_prescription(task_id: str, storage: FileStorageService) -> Dict[str, Any]:
    """Load and return prescription GeoJSON for a task. Raises FileNotFoundError if missing."""
    path = storage.get_prescription_path(task_id)
    if not path:
        raise FileNotFoundError(f"Prescription not found for task {task_id}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def update_prescription(
    task_id: str,
    body: PrescriptionUpdateRequest,
    storage: FileStorageService,
) -> Dict[str, Any]:
    """Apply spray updates to prescription GeoJSON and write back. Returns updated GeoJSON."""
    path = storage.get_prescription_path(task_id)
    if not path:
        raise FileNotFoundError(f"Prescription not found for task {task_id}")

    with open(path, "r", encoding="utf-8") as f:
        geojson: Dict[str, Any] = json.load(f)

    features = geojson.get("features")
    if not isinstance(features, list):
        raise ValueError("GeoJSON has no features array")

    updates_by_id = {u.featureId: u.spray for u in body.updates}

    for feature in features:
        if not isinstance(feature, dict):
            continue
        # GeoJSON feature identity may be provided as:
        # - feature["id"]
        # - feature["properties"]["id"]
        # - feature["properties"]["cluster"] (current prescription standard)
        props = feature.get("properties") if isinstance(feature.get("properties"), dict) else None
        fid_candidates: List[Any] = [feature.get("id")]
        if props is not None:
            fid_candidates.extend([props.get("id"), props.get("cluster")])

        for fid in fid_candidates:
            if fid is None:
                continue
            fid_str = str(fid)
            if fid_str in updates_by_id:
                if "properties" not in feature or not isinstance(feature["properties"], dict):
                    feature["properties"] = {}
                feature["properties"]["spray"] = updates_by_id[fid_str]
                break

    path = Path(path)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        tmp_path.replace(path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

    return geojson


def list_prescriptions(storage: FileStorageService) -> PrescriptionListResponse:
    """Return list of tasks that have a prescription file."""
    raw = storage.list_tasks_with_prescription()
    items: List[PrescriptionListItem] = [
        PrescriptionListItem(
            taskId=item["taskId"],
            taskName=item.get("taskName"),
            prescriptionUrl=item.get("prescriptionUrl"),
        )
        for item in raw
    ]
    return PrescriptionListResponse(items=items)


def get_prescription_status(
    task_id: str,
    storage: FileStorageService,
) -> PrescriptionStatusResponse:
    """
    Return status of the prescription generation job for a task.

    If no explicit status file exists but a prescription file is present, treat
    the status as completed. If neither exists, report not_started so the
    frontend can distinguish between missing jobs and in-progress work.
    """
    status_data: Optional[Dict[str, Any]] = storage.read_prescription_status(task_id)
    prescription_path = storage.get_prescription_path(task_id)

    if status_data is None:
        if prescription_path:
            return PrescriptionStatusResponse(
                taskId=task_id,
                status="completed",
                message="Prescription file found but no explicit status recorded.",
                extra=None,
            )
        return PrescriptionStatusResponse(
            taskId=task_id,
            status="not_started",
            message="Prescription job has not been started yet.",
            extra=None,
        )

    status = str(status_data.get("status", "not_started"))
    message = status_data.get("message")
    return PrescriptionStatusResponse(taskId=task_id, status=status, message=message)


def set_prescription_config(
    task_id: str,
    config: PrescriptionConfig,
    storage: FileStorageService,
) -> PrescriptionConfig:
    """
    Store per-task configuration for the prescription job.

    This does not immediately trigger a re-run; it only persists configuration
    that will be used the next time the prescription module is invoked.
    """
    storage.write_prescription_config(task_id, config.model_dump(exclude_none=True))
    return config
