"""Prescription business logic: get, update, list prescription GeoJSON."""

import json
from pathlib import Path
from typing import Any, Dict, List

from app.schemas.prescription import (
    PrescriptionListItem,
    PrescriptionListResponse,
    PrescriptionUpdateRequest,
)
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
        fid = feature.get("id")
        if fid is None and isinstance(feature.get("properties"), dict):
            fid = feature["properties"].get("id")
        if fid is not None:
            fid_str = str(fid)
            if fid_str in updates_by_id:
                if "properties" not in feature or not isinstance(feature["properties"], dict):
                    feature["properties"] = {}
                feature["properties"]["spray"] = updates_by_id[fid_str]

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
