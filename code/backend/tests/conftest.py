"""Shared pytest fixtures for backend tests. TestClient with dependency overrides."""

import pytest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.services.file_storage import FileStorageService


@pytest.fixture
def path_jobs_dir(tmp_path: Path) -> Path:
    """Temporary path_jobs directory for pathing tests."""
    d = tmp_path / "path_jobs"
    d.mkdir(parents=True, exist_ok=True)
    return d


@pytest.fixture
def rtk_base_config_path(path_jobs_dir: Path) -> Path:
    """RTK base config file path under path_jobs_dir."""
    return path_jobs_dir / "rtk_base_config.json"


@pytest.fixture
def path_jobs_store() -> dict:
    """Fresh in-memory path jobs store per test."""
    return {}


@pytest.fixture
def upload_dir(tmp_path: Path) -> Path:
    """Temporary upload directory."""
    d = tmp_path / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


@pytest.fixture
def results_dir(tmp_path: Path) -> Path:
    """Temporary results directory for FileStorageService."""
    d = tmp_path / "results"
    d.mkdir(parents=True, exist_ok=True)
    return d


@pytest.fixture
def file_storage_service(results_dir: Path) -> FileStorageService:
    """FileStorageService using temporary results_dir."""
    return FileStorageService(results_dir=results_dir)


@pytest.fixture
def client(
    path_jobs_dir: Path,
    rtk_base_config_path: Path,
    path_jobs_store: dict,
    upload_dir: Path,
    results_dir: Path,
):
    """TestClient with overridden dependencies (temp dirs, fresh store)."""
    def override_get_path_jobs_dir():
        return path_jobs_dir

    def override_get_rtk_base_config_path():
        return rtk_base_config_path

    def override_get_path_jobs_store_dep():
        return path_jobs_store

    def override_get_upload_dir():
        return upload_dir

    def override_get_file_storage_service():
        return FileStorageService(results_dir=results_dir)

    app.dependency_overrides[deps.get_path_jobs_dir] = override_get_path_jobs_dir
    app.dependency_overrides[deps.get_rtk_base_config_path] = override_get_rtk_base_config_path
    app.dependency_overrides[deps.get_path_jobs_store_dep] = override_get_path_jobs_store_dep
    app.dependency_overrides[deps.get_upload_dir] = override_get_upload_dir
    app.dependency_overrides[deps.get_file_storage_service] = override_get_file_storage_service

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
