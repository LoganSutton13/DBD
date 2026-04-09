"""Unit tests for results handlers."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.handlers import results as results_handlers
from app.schemas.results import TaskResultItem, TaskSummaryResponse


def test_get_task_summary_no_results_raises_file_not_found():
    """get_task_summary when storage returns no image or report path raises FileNotFoundError."""
    storage = MagicMock()
    storage.get_image_path.return_value = None
    storage.get_report_path.return_value = None
    with pytest.raises(FileNotFoundError, match="No results found"):
        results_handlers.get_task_summary("task-1", storage, "http://localhost:8000")


def test_get_task_summary_both_paths_returns_urls():
    """get_task_summary when both image and report exist returns TaskSummaryResponse with URLs."""
    storage = MagicMock()
    storage.get_image_path.return_value = Path("/tmp/task-1/odm_orthophoto/odm_orthophoto.png")
    storage.get_report_path.return_value = Path("/tmp/task-1/odm_report/report.pdf")
    result = results_handlers.get_task_summary("task-1", storage, "http://localhost:8000")
    assert isinstance(result, TaskSummaryResponse)
    assert result.taskId == "task-1"
    assert result.orthophotoPngUrl == "http://localhost:8000/api/v1/results/task-1/orthophoto.png"
    assert result.reportPdfUrl == "http://localhost:8000/api/v1/results/task-1/report.pdf"


def test_get_task_summary_only_image_sets_orthophoto_url():
    """get_task_summary when only image path exists sets orthophoto URL, report optional."""
    storage = MagicMock()
    storage.get_image_path.return_value = Path("/tmp/task-1/odm_orthophoto/odm_orthophoto.png")
    storage.get_report_path.return_value = None
    result = results_handlers.get_task_summary("task-1", storage, "http://localhost:8000")
    assert result.orthophotoPngUrl is not None
    assert "orthophoto.png" in result.orthophotoPngUrl
    assert result.reportPdfUrl is None


def test_get_task_summary_base_url_stripped():
    """get_task_summary strips trailing slash from base_url."""
    storage = MagicMock()
    storage.get_image_path.return_value = Path("/x/y.png")
    storage.get_report_path.return_value = None
    result = results_handlers.get_task_summary("task-1", storage, "http://localhost:8000/")
    assert result.orthophotoPngUrl.startswith("http://localhost:8000/")


def test_list_processed_files_returns_task_result_items():
    """list_processed_files converts storage list to TaskResultItem list."""
    storage = MagicMock()
    storage.list_tasks_with_orthophoto.return_value = [
        {
            "taskId": "t1",
            "orthophotoPngUrl": "/api/v1/results/t1/orthophoto.png",
            "reportPdfUrl": "/api/v1/results/t1/report.pdf",
            "taskName": "Field One",
        },
    ]
    result = results_handlers.list_processed_files(storage)
    assert len(result) == 1
    assert isinstance(result[0], TaskResultItem)
    assert result[0].taskId == "t1"
    assert result[0].orthophotoPngUrl == "/api/v1/results/t1/orthophoto.png"
    assert result[0].reportPdfUrl == "/api/v1/results/t1/report.pdf"
    assert result[0].taskName == "Field One"


def test_list_processed_files_empty_returns_empty_list():
    """list_processed_files when storage returns empty list returns []."""
    storage = MagicMock()
    storage.list_tasks_with_orthophoto.return_value = []
    assert results_handlers.list_processed_files(storage) == []


def test_get_orthophoto_path_delegates_to_storage():
    """get_orthophoto_path returns storage.get_image_path result."""
    storage = MagicMock()
    path = Path("/results/t1/odm_orthophoto/odm_orthophoto.png")
    storage.get_image_path.return_value = path
    assert results_handlers.get_orthophoto_path("t1", storage) == path
    storage.get_image_path.return_value = None
    assert results_handlers.get_orthophoto_path("t1", storage) is None


def test_get_report_path_delegates_to_storage():
    """get_report_path returns storage.get_report_path result."""
    storage = MagicMock()
    path = Path("/results/t1/odm_report/report.pdf")
    storage.get_report_path.return_value = path
    assert results_handlers.get_report_path("t1", storage) == path
    storage.get_report_path.return_value = None
    assert results_handlers.get_report_path("t1", storage) is None


def test_delete_task_results_success_returns_response():
    """delete_task_results returns success response for existing task."""
    storage = MagicMock()
    result = results_handlers.delete_task_results("task-1", storage)
    assert result.deleted is True
    assert result.taskId == "task-1"
    assert "deleted successfully" in result.message
    storage.delete_task_results.assert_called_once_with("task-1")


def test_delete_task_results_missing_task_maps_to_404():
    """delete_task_results maps missing task to HTTP 404."""
    storage = MagicMock()
    storage.delete_task_results.side_effect = FileNotFoundError("Task results not found")
    with pytest.raises(HTTPException) as exc:
        results_handlers.delete_task_results("missing-task", storage)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Task results not found"


def test_delete_task_results_invalid_task_id_maps_to_400():
    """delete_task_results maps invalid task_id to HTTP 400."""
    storage = MagicMock()
    storage.delete_task_results.side_effect = ValueError("Invalid task_id")
    with pytest.raises(HTTPException) as exc:
        results_handlers.delete_task_results("../bad", storage)
    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid task_id"
