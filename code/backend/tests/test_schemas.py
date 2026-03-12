"""Minimal schema serialization tests to guard API contract."""

import pytest

from app.schemas.common import HealthResponse, RootResponse
from app.schemas.pathing import PathJobStatusResponse, RtkBaseResponse
from app.schemas.results import TaskSummaryResponse
from app.schemas.upload import UploadInitResponse


def test_rtk_base_response_serializes():
    """RtkBaseResponse serializes to dict with longitude, latitude."""
    r = RtkBaseResponse(longitude=10.0, latitude=20.0)
    d = r.model_dump()
    assert d["longitude"] == 10.0
    assert d["latitude"] == 20.0


def test_path_job_status_response_serializes():
    """PathJobStatusResponse serializes to dict."""
    r = PathJobStatusResponse(status="processing", error=None)
    d = r.model_dump()
    assert d["status"] == "processing"
    assert d.get("error") is None


def test_task_summary_response_serializes():
    """TaskSummaryResponse serializes with taskId and optional URLs."""
    r = TaskSummaryResponse(taskId="t1", orthophotoPngUrl="http://x/y.png", reportPdfUrl=None)
    d = r.model_dump()
    assert d["taskId"] == "t1"
    assert d["orthophotoPngUrl"] == "http://x/y.png"
    assert d["reportPdfUrl"] is None


def test_health_and_root_responses_serialize():
    """Health and root response models serialize."""
    h = HealthResponse(status="healthy", service="drone-imagery-api")
    assert h.model_dump()["status"] == "healthy"
    root = RootResponse(message="ok", status="healthy")
    assert root.model_dump()["message"] == "ok"


def test_upload_init_response_serializes():
    """UploadInitResponse serializes with task_id."""
    r = UploadInitResponse(task_id="uuid-123")
    assert r.model_dump()["task_id"] == "uuid-123"
