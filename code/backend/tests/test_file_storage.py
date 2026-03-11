"""Unit tests for FileStorageService."""

from pathlib import Path

from app.services.file_storage import FileStorageService


def test_write_manifest_and_read_manifest_roundtrip(results_dir: Path):
    """write_manifest then read_manifest returns same data."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-1"
    data = {"task_id": task_id, "task_name": "My Task", "created_at": "2024-01-01T00:00:00"}
    storage.write_manifest(task_id, data)
    read_back = storage.read_manifest(task_id)
    assert read_back is not None
    assert read_back["task_id"] == task_id
    assert read_back["task_name"] == "My Task"
    assert read_back["created_at"] == data["created_at"]


def test_read_manifest_missing_returns_none(results_dir: Path):
    """read_manifest for non-existent task returns None."""
    storage = FileStorageService(results_dir=results_dir)
    assert storage.read_manifest("nonexistent") is None


def test_get_image_path_no_dir_returns_none(results_dir: Path):
    """get_image_path when task dir does not exist returns None."""
    storage = FileStorageService(results_dir=results_dir)
    assert storage.get_image_path("no-task") is None


def test_get_image_path_with_orthophoto_returns_path(results_dir: Path):
    """get_image_path when odm_orthophoto/odm_orthophoto.png exists returns that path."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-with-ortho"
    ortho_dir = results_dir / task_id / "odm_orthophoto"
    ortho_dir.mkdir(parents=True)
    (ortho_dir / "odm_orthophoto.png").write_bytes(b"\x89PNG")
    result = storage.get_image_path(task_id)
    assert result is not None
    assert result.name == "odm_orthophoto.png"
    assert result.parent.name == "odm_orthophoto"


def test_get_report_path_no_dir_returns_none(results_dir: Path):
    """get_report_path when task dir does not exist returns None."""
    storage = FileStorageService(results_dir=results_dir)
    assert storage.get_report_path("no-task") is None


def test_get_report_path_with_report_returns_path(results_dir: Path):
    """get_report_path when odm_report/report.pdf exists returns that path."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-with-report"
    report_dir = results_dir / task_id / "odm_report"
    report_dir.mkdir(parents=True)
    (report_dir / "report.pdf").write_bytes(b"%PDF")
    result = storage.get_report_path(task_id)
    assert result is not None
    assert result.name == "report.pdf"
    assert result.parent.name == "odm_report"


def test_list_tasks_with_orthophoto_empty_returns_empty_list(results_dir: Path):
    """list_tasks_with_orthophoto on empty results_dir returns []."""
    storage = FileStorageService(results_dir=results_dir)
    assert storage.list_tasks_with_orthophoto() == []


def test_list_tasks_with_orthophoto_one_task_returns_item(results_dir: Path):
    """list_tasks_with_orthophoto with one task having orthophoto returns one item."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-1"
    ortho_dir = results_dir / task_id / "odm_orthophoto"
    ortho_dir.mkdir(parents=True)
    (ortho_dir / "odm_orthophoto.png").write_bytes(b"\x89PNG")
    tasks = storage.list_tasks_with_orthophoto()
    assert len(tasks) == 1
    assert tasks[0]["taskId"] == task_id
    assert "orthophotoPngUrl" in tasks[0]
    assert "reportPdfUrl" in tasks[0]
    assert "/api/v1/results/task-1/orthophoto.png" in tasks[0]["orthophotoPngUrl"]


def test_list_tasks_with_orthophoto_includes_task_name_from_manifest(results_dir: Path):
    """list_tasks_with_orthophoto includes taskName when manifest has task_name."""
    storage = FileStorageService(results_dir=results_dir)
    task_id = "task-named"
    ortho_dir = results_dir / task_id / "odm_orthophoto"
    ortho_dir.mkdir(parents=True)
    (ortho_dir / "odm_orthophoto.png").write_bytes(b"\x89PNG")
    storage.write_manifest(task_id, {"task_id": task_id, "task_name": "My Field", "created_at": "2024-01-01T00:00:00"})
    tasks = storage.list_tasks_with_orthophoto()
    assert len(tasks) == 1
    assert tasks[0].get("taskName") == "My Field"
