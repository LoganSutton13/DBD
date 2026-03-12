"""Unit tests for pathing handlers."""

from pathlib import Path

import pytest

from app.handlers import pathing as pathing_handlers
from app.schemas.pathing import (
    PathJobCompletedResponse,
    PathJobFailedResponse,
    PathJobProcessingResponse,
    PathJobStatusResponse,
)


def test_get_rtk_base_missing_config_returns_defaults(rtk_base_config_path: Path):
    """get_rtk_base when config file does not exist returns (0, 0)."""
    assert not rtk_base_config_path.exists()
    result = pathing_handlers.get_rtk_base(rtk_base_config_path)
    assert result.longitude == 0.0
    assert result.latitude == 0.0


def test_get_rtk_base_with_config_returns_stored_values(rtk_base_config_path: Path):
    """get_rtk_base when config exists returns stored longitude and latitude."""
    rtk_base_config_path.parent.mkdir(parents=True, exist_ok=True)
    rtk_base_config_path.write_text('{"longitude": 10.5, "latitude": 20.25}', encoding="utf-8")
    result = pathing_handlers.get_rtk_base(rtk_base_config_path)
    assert result.longitude == 10.5
    assert result.latitude == 20.25


def test_set_rtk_base_persists_and_read_back(rtk_base_config_path: Path):
    """set_rtk_base writes config; get_rtk_base reads same values."""
    rtk_base_config_path.parent.mkdir(parents=True, exist_ok=True)
    pathing_handlers.set_rtk_base(rtk_base_config_path, 15.0, -5.0)
    result = pathing_handlers.get_rtk_base(rtk_base_config_path)
    assert result.longitude == 15.0
    assert result.latitude == -5.0


def test_get_path_job_status_not_in_store_raises_key_error(path_jobs_store: dict):
    """get_path_job_status with unknown path_job_id raises KeyError."""
    with pytest.raises(KeyError, match="Path job not found"):
        pathing_handlers.get_path_job_status("unknown-id", path_jobs_store)


def test_get_path_job_status_returns_processing(path_jobs_store: dict):
    """get_path_job_status with job in store returns PathJobStatusResponse."""
    path_jobs_store["job-1"] = {"status": "processing", "error": None}
    result = pathing_handlers.get_path_job_status("job-1", path_jobs_store)
    assert isinstance(result, PathJobStatusResponse)
    assert result.status == "processing"
    assert result.error is None


def test_get_path_job_status_returns_error_when_present(path_jobs_store: dict):
    """get_path_job_status includes error when store has error."""
    path_jobs_store["job-1"] = {"status": "failed", "error": "Something broke"}
    result = pathing_handlers.get_path_job_status("job-1", path_jobs_store)
    assert result.status == "failed"
    assert result.error == "Something broke"


def test_get_path_job_result_not_in_store_raises_key_error(path_jobs_store: dict):
    """get_path_job_result with unknown path_job_id raises KeyError."""
    with pytest.raises(KeyError, match="Path job not found"):
        pathing_handlers.get_path_job_result("unknown-id", path_jobs_store)


def test_get_path_job_result_processing_returns_processing_response(path_jobs_store: dict):
    """get_path_job_result when status is processing returns PathJobProcessingResponse."""
    path_jobs_store["job-1"] = {"status": "processing"}
    result = pathing_handlers.get_path_job_result("job-1", path_jobs_store)
    assert isinstance(result, PathJobProcessingResponse)
    assert result.status == "processing"
    assert "in progress" in result.message


def test_get_path_job_result_failed_returns_failed_response(path_jobs_store: dict):
    """get_path_job_result when status is failed returns PathJobFailedResponse."""
    path_jobs_store["job-1"] = {"status": "failed", "error": "Generation failed"}
    result = pathing_handlers.get_path_job_result("job-1", path_jobs_store)
    assert isinstance(result, PathJobFailedResponse)
    assert result.status == "failed"
    assert result.error == "Generation failed"


def test_get_path_job_result_completed_returns_completed_response(path_jobs_store: dict):
    """get_path_job_result when status is completed returns PathJobCompletedResponse."""
    path_jobs_store["job-1"] = {
        "status": "completed",
        "waypoints": [{"lat": 1.0, "lon": 2.0}],
        "heading": 90.0,
        "generated_at": "2024-01-01T00:00:00",
        "boundary_name": "Field A",
        "robot_width": 2.0,
        "coverage_width": 6.0,
    }
    result = pathing_handlers.get_path_job_result("job-1", path_jobs_store)
    assert isinstance(result, PathJobCompletedResponse)
    assert result.status == "completed"
    assert len(result.waypoints) == 1
    assert result.waypoints[0].lat == 1.0
    assert result.waypoints[0].lon == 2.0
    assert result.heading == 90.0
    assert result.boundary_name == "Field A"


def test_save_path_to_task_job_not_in_store_raises_key_error(path_jobs_store: dict, tmp_path: Path):
    """save_path_to_task when path_job_id not in store raises KeyError."""
    with pytest.raises(KeyError, match="Path job not found"):
        pathing_handlers.save_path_to_task("unknown", "task-1", path_jobs_store, tmp_path)


def test_save_path_to_task_status_not_completed_raises_value_error(path_jobs_store: dict, tmp_path: Path):
    """save_path_to_task when job status is not completed raises ValueError."""
    path_jobs_store["job-1"] = {"status": "processing", "job_dir": str(tmp_path)}
    with pytest.raises(ValueError, match="not ready to save"):
        pathing_handlers.save_path_to_task("job-1", "task-1", path_jobs_store, tmp_path)


def test_save_path_to_task_missing_job_dir_raises_value_error(path_jobs_store: dict, tmp_path: Path):
    """save_path_to_task when store has no job_dir raises ValueError."""
    path_jobs_store["job-1"] = {"status": "completed"}  # no job_dir
    with pytest.raises(ValueError, match="Path job directory not found"):
        pathing_handlers.save_path_to_task("job-1", "task-1", path_jobs_store, tmp_path)


def test_save_path_to_task_empty_task_id_raises_value_error(path_jobs_store: dict, tmp_path: Path):
    """save_path_to_task with empty task_id raises ValueError."""
    job_dir = tmp_path / "path_job"
    job_dir.mkdir()
    (job_dir / "track.json").write_text("{}", encoding="utf-8")
    path_jobs_store["job-1"] = {
        "status": "completed",
        "job_dir": str(job_dir),
    }
    with pytest.raises(ValueError, match="task_id is required"):
        pathing_handlers.save_path_to_task("job-1", "  ", path_jobs_store, tmp_path)


def test_save_path_to_task_success(path_jobs_store: dict, tmp_path: Path):
    """save_path_to_task copies track.json to results_dir/task_id/robot_path.json."""
    job_dir = tmp_path / "path_job"
    job_dir.mkdir()
    track_content = '{"waypoints": []}'
    (job_dir / "track.json").write_text(track_content, encoding="utf-8")
    results_dir = tmp_path / "results"
    results_dir.mkdir()
    path_jobs_store["job-1"] = {
        "status": "completed",
        "job_dir": str(job_dir),
    }
    result = pathing_handlers.save_path_to_task("job-1", "task-123", path_jobs_store, results_dir)
    assert result.message == "Path saved to task"
    assert result.task_id == "task-123"
    assert "robot_path.json" in result.saved_path
    dest = results_dir / "task-123" / "robot_path.json"
    assert dest.exists()
    assert dest.read_text(encoding="utf-8") == track_content
