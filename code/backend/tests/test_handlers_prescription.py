"""Unit tests for prescription handlers."""

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.handlers import prescription as prescription_handlers
from app.schemas.prescription import (
    PrescriptionListItem,
    PrescriptionListResponse,
    PrescriptionUpdateItem,
    PrescriptionUpdateRequest,
)
from app.services.file_storage import FileStorageService

MINIMAL_GEOJSON = {"type": "FeatureCollection", "features": [{"type": "Feature", "id": "1", "properties": {}, "geometry": None}]}
MINIMAL_CLUSTER_GEOJSON = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"cluster": 1}, "geometry": None}]}


def test_get_prescription_missing_raises_file_not_found():
    """get_prescription when storage returns no path raises FileNotFoundError."""
    storage = MagicMock()
    storage.get_prescription_path.return_value = None
    with pytest.raises(FileNotFoundError, match="Prescription not found for task task-1"):
        prescription_handlers.get_prescription("task-1", storage)


def test_get_prescription_returns_geojson_dict(results_dir: Path):
    """get_prescription when file exists returns GeoJSON dict."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-rx"
    task_dir = results_dir / task_id
    task_dir.mkdir(parents=True)
    (task_dir / "prescription.geojson").write_text(json.dumps(MINIMAL_GEOJSON))
    result = prescription_handlers.get_prescription(task_id, storage)
    assert result["type"] == "FeatureCollection"
    assert "features" in result
    assert len(result["features"]) == 1
    assert result["features"][0]["id"] == "1"


def test_update_prescription_missing_raises_file_not_found():
    """update_prescription when storage returns no path raises FileNotFoundError."""
    storage = MagicMock()
    storage.get_prescription_path.return_value = None
    body = PrescriptionUpdateRequest(updates=[PrescriptionUpdateItem(featureId="1", spray="high")])
    with pytest.raises(FileNotFoundError, match="Prescription not found for task task-1"):
        prescription_handlers.update_prescription("task-1", body, storage)


def test_update_prescription_applies_updates_and_returns_geojson(results_dir: Path):
    """update_prescription applies spray updates and returns updated GeoJSON; file on disk is updated."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-update"
    task_dir = results_dir / task_id
    task_dir.mkdir(parents=True)
    (task_dir / "prescription.geojson").write_text(json.dumps(MINIMAL_GEOJSON))
    body = PrescriptionUpdateRequest(updates=[PrescriptionUpdateItem(featureId="1", spray="high")])
    result = prescription_handlers.update_prescription(task_id, body, storage)
    assert result["features"][0]["properties"]["spray"] == "high"
    with open(task_dir / "prescription.geojson", "r", encoding="utf-8") as f:
        on_disk = json.load(f)
    assert on_disk["features"][0]["properties"]["spray"] == "high"


def test_update_prescription_cluster_id_applies_updates_and_returns_geojson(results_dir: Path):
    """update_prescription applies spray updates when GeoJSON has no feature id but has properties.cluster."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-update-cluster"
    task_dir = results_dir / task_id
    task_dir.mkdir(parents=True)
    (task_dir / "prescription.geojson").write_text(json.dumps(MINIMAL_CLUSTER_GEOJSON))
    body = PrescriptionUpdateRequest(updates=[PrescriptionUpdateItem(featureId="1", spray="high")])
    result = prescription_handlers.update_prescription(task_id, body, storage)
    assert result["features"][0]["properties"]["spray"] == "high"

    with open(task_dir / "prescription.geojson", "r", encoding="utf-8") as f:
        on_disk = json.load(f)
    assert on_disk["features"][0]["properties"]["spray"] == "high"


def test_update_prescription_no_features_array_raises_value_error(results_dir: Path):
    """update_prescription when GeoJSON has no features array raises ValueError."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-bad"
    task_dir = results_dir / task_id
    task_dir.mkdir(parents=True)
    (task_dir / "prescription.geojson").write_text("{}")
    body = PrescriptionUpdateRequest(updates=[PrescriptionUpdateItem(featureId="1", spray="high")])
    with pytest.raises(ValueError, match="GeoJSON has no features array"):
        prescription_handlers.update_prescription(task_id, body, storage)


def test_list_prescriptions_returns_list_response():
    """list_prescriptions converts storage list to PrescriptionListResponse."""
    storage = MagicMock()
    storage.list_tasks_with_prescription.return_value = [
        {"taskId": "t1", "prescriptionUrl": "/api/v1/prescription/t1", "taskName": "T1"},
    ]
    result = prescription_handlers.list_prescriptions(storage)
    assert isinstance(result, PrescriptionListResponse)
    assert len(result.items) == 1
    assert isinstance(result.items[0], PrescriptionListItem)
    assert result.items[0].taskId == "t1"
    assert result.items[0].taskName == "T1"
    assert result.items[0].prescriptionUrl == "/api/v1/prescription/t1"


def test_list_prescriptions_empty_returns_empty_items():
    """list_prescriptions when storage returns empty list returns PrescriptionListResponse with empty items."""
    storage = MagicMock()
    storage.list_tasks_with_prescription.return_value = []
    result = prescription_handlers.list_prescriptions(storage)
    assert isinstance(result, PrescriptionListResponse)
    assert result.items == []
