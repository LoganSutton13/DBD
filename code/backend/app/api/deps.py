"""FastAPI dependency providers for API routes."""

from pathlib import Path
from typing import Tuple

from fastapi import Depends

from app.core.config import settings
from app.handlers.pathing import get_path_jobs_store
from app.services.file_storage import FileStorageService


def get_upload_dir() -> Path:
    return Path(settings.UPLOAD_DIR)


def get_path_jobs_dir() -> Path:
    path = Path(settings.PATH_JOBS_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_rtk_base_config_path(path_jobs_dir: Path = Depends(get_path_jobs_dir)) -> Path:
    return path_jobs_dir / "rtk_base_config.json"


def get_upload_settings_config_path(path_jobs_dir: Path = Depends(get_path_jobs_dir)) -> Path:
    return path_jobs_dir / "upload_settings.json"


def get_path_jobs_store_dep():
    """Dependency that returns the path jobs in-memory store."""
    return get_path_jobs_store()


def get_shapefile_extensions() -> Tuple[str, ...]:
    return tuple(settings.SHAPEFILE_EXTENSIONS)


def get_file_storage_service() -> FileStorageService:
    return FileStorageService()
