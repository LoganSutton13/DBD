"""Upload business logic: chunked init/chunk/finalize, status, list, delete."""

import json as _json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles
from fastapi import UploadFile
from pyodm import Node

from app.schemas.upload import (
    ChunkReceivedResponse,
    BoundaryUploadResponse,
    TaskStatusResponse,
    UploadFinalizeResponse,
    UploadInitResponse,
)
from app.services.file_storage import FileStorageService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UploadFinalizeRequest:
    task_id: str
    files_json: str
    task_name: Optional[str]


@dataclass(frozen=True)
class UploadFinalizeConfig:
    allowed_image_extensions: List[str]
    allowed_auxiliary_extensions: List[str]
    nodeodm_host: str
    nodeodm_port: int
    nodeodm_options: Optional[Dict[str, Any]] = None


def _sanitize_filename(filename: str) -> str:
    """Prevent path traversal; allow only basename."""
    return Path(filename).name if filename else ""


async def upload_boundary_files_for_task(
    storage: FileStorageService,
    task_id: str,
    files: List[UploadFile],
    allowed_shapefile_extensions: List[str],
    max_file_size_bytes: int,
) -> BoundaryUploadResponse:
    """Store boundary shapefile components under an existing task folder."""
    task_dir = storage.results_dir / task_id
    if not task_dir.exists():
        raise FileNotFoundError("Task not found")

    if not files:
        raise ValueError("No boundary files provided")

    extensions_set = set(allowed_shapefile_extensions)
    saved_names: List[str] = []
    for file in files:
        if not file.filename:
            raise ValueError("Boundary file with no filename detected")
        safe_name = _sanitize_filename(file.filename)
        ext = Path(safe_name).suffix.lower()
        if ext not in extensions_set:
            raise ValueError(
                f"Unsupported boundary file type: {safe_name}. Allowed: {', '.join(sorted(extensions_set))}"
            )

        content = await file.read()
        if len(content) > max_file_size_bytes:
            raise ValueError(
                f"Boundary file {safe_name} exceeds {max_file_size_bytes // (1024 * 1024)}MB"
            )

        output_path = task_dir / safe_name
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(content)
        saved_names.append(safe_name)

    if not any(name.lower().endswith(".shp") for name in saved_names):
        raise ValueError("At least one .shp file is required")

    return BoundaryUploadResponse(
        message="Boundary files saved",
        task_id=task_id,
        file_count=len(saved_names),
        files=saved_names,
    )


def upload_init(
    upload_dir: Path,
    storage: FileStorageService,
    task_name: Optional[str] = None,
) -> UploadInitResponse:
    """Initialize chunked upload: create task_id and directory."""
    import uuid
    from datetime import datetime

    task_id = str(uuid.uuid4())
    dir_path = upload_dir / task_id
    dir_path.mkdir(parents=True, exist_ok=True)
    try:
        storage.write_manifest(task_id, {
            "task_id": task_id,
            "task_name": task_name or "",
            "created_at": datetime.utcnow().isoformat(),
        })
    except (OSError, ValueError):
        pass
    return UploadInitResponse(task_id=task_id)


async def upload_chunk(
    upload_dir: Path,
    task_id: str,
    filename: str,
    chunk_index: int,
    total_chunks: int,
    chunk_file: UploadFile,
    max_chunk_bytes: int,
) -> ChunkReceivedResponse:
    """Write one chunk to disk. Chunks must be sent in order."""
    safe_name = _sanitize_filename(filename)
    if not safe_name:
        raise ValueError("Invalid filename")
    dir_path = upload_dir / task_id
    if not dir_path.exists():
        raise FileNotFoundError("Upload session not found; call /init first")
    if chunk_index < 0 or total_chunks < 1 or chunk_index >= total_chunks:
        raise ValueError("Invalid chunk_index or total_chunks")
    content = await chunk_file.read()
    if len(content) > max_chunk_bytes:
        raise ValueError(f"Chunk size exceeds maximum ({max_chunk_bytes} bytes)")
    file_path = dir_path / safe_name
    mode = "wb" if chunk_index == 0 else "ab"
    async with aiofiles.open(file_path, mode) as f:
        await f.write(content)
    return ChunkReceivedResponse(received=chunk_index)


def upload_finalize(
    *,
    background_tasks,
    upload_dir: Path,
    storage: FileStorageService,
    request: UploadFinalizeRequest,
    config: UploadFinalizeConfig,
) -> UploadFinalizeResponse:
    """Verify files and start NodeODM processing."""
    from datetime import datetime

    task_id = request.task_id
    task_name = request.task_name
    dir_path = upload_dir / task_id
    if not dir_path.exists():
        raise FileNotFoundError("Upload session not found")
    try:
        file_list = _json.loads(request.files_json)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid files JSON") from exc
    allowed_ext = set(config.allowed_image_extensions) | set(config.allowed_auxiliary_extensions)
    saved_files = []
    for entry in file_list:
        fn = entry.get("filename")
        size = entry.get("size")
        if not fn:
            continue
        safe_name = _sanitize_filename(fn)
        ext = Path(safe_name).suffix.lower()
        if ext not in allowed_ext:
            raise ValueError(
                f"File {safe_name} has unsupported extension (allowed: images {config.allowed_image_extensions}; auxiliary {config.allowed_auxiliary_extensions})"
            )
        file_path = dir_path / safe_name
        if not file_path.is_file():
            raise ValueError(f"File not found: {safe_name}")
        if size is not None and file_path.stat().st_size != int(size):
            raise ValueError(f"File size mismatch for {safe_name}")
        saved_files.append(str(file_path))
    if not saved_files:
        raise ValueError("No valid files to process")

    n = Node(config.nodeodm_host, config.nodeodm_port)
    orthophoto_options = config.nodeodm_options or {
        "radiometric-calibration": "camera",
        "feature-quality": "high",
        "matcher-type": "flann",
        "min-num-features": 8000,
        "ignore-gsd": True,
        "skip-3dmodel": True,
        "orthophoto-resolution": 5.0,
        "orthophoto-no-tiled": False,
        "texturing-skip-global-seam-leveling": True,
        "pc-quality": "high",
        "orthophoto-png": True,
    }
    orthophoto_options["orthophoto-png"] = True
    name = (task_name or "").strip()
    if name:
        task = n.create_task(saved_files, options=orthophoto_options, name=name)
    else:
        task = n.create_task(saved_files, options=orthophoto_options)
    nodeodm_task_id = task.uuid
    background_tasks.add_task(storage.poll_for_download, task, task_id)
    return UploadFinalizeResponse(
        message="Files uploaded successfully, processing started",
        task_id=task_id,
        nodeodm_task_id=nodeodm_task_id,
        file_count=len(saved_files),
        status="processing",
        files=[Path(p).name for p in saved_files],
        created_at=datetime.utcnow().isoformat(),
        task_name=task_name or None,
    )


def get_upload_status(task_id: str, nodeodm_host: str, nodeodm_port: int) -> TaskStatusResponse:
    """Return NodeODM task status and progress."""
    n = Node(nodeodm_host, nodeodm_port)
    task = n.get_task(task_id)
    info = task.info()
    return TaskStatusResponse(status=str(info.status), progress=str(info.progress))


def delete_upload(task_id: str) -> None:
    """Delete a NodeODM task. Not implemented; raises NotImplementedError."""
    raise NotImplementedError("Delete upload not implemented")


def list_uploads() -> None:
    """List all NodeODM tasks. Not implemented; raises NotImplementedError."""
    raise NotImplementedError("List uploads not implemented")
