"""
Upload API endpoints for drone imagery files
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
import os
from pathlib import Path
import aiofiles
from datetime import datetime
import requests
from dotenv import load_dotenv
from pyodm import Node

from app.core.config import settings
from app.services.file_storage import FileStorageService

load_dotenv()

# Create router
router = APIRouter()

def _upload_dir() -> Path:
    return Path(settings.UPLOAD_DIR)

def _sanitize_filename(filename: str) -> str:
    """Prevent path traversal; allow only basename."""
    return Path(filename).name if filename else ""


# --- Chunked upload (init / chunk / finalize) ---

@router.post("/init")
async def upload_init(
    task_name: Optional[str] = Form(None),
    heading: Optional[str] = Form(None),
    grid_size: Optional[str] = Form(None),
):
    """
    Initialize a chunked upload. Creates task_id and directory; client then
    uploads chunks via /chunk and calls /finalize when done.
    """
    task_id = str(uuid.uuid4())
    dir_path = _upload_dir() / task_id
    dir_path.mkdir(parents=True, exist_ok=True)
    try:
        FileStorageService().write_manifest(task_id, {
            "task_id": task_id,
            "task_name": task_name or "",
            "created_at": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass
    return JSONResponse(status_code=200, content={"task_id": task_id})


@router.post("/chunk")
async def upload_chunk(
    task_id: str = Form(...),
    filename: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    chunk_file: UploadFile = File(..., alias="chunk"),
):
    """
    Upload a single chunk for a file. Chunks must be sent in order (0, 1, ..., total_chunks-1).
    """
    safe_name = _sanitize_filename(filename)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")
    dir_path = _upload_dir() / task_id
    if not dir_path.exists():
        raise HTTPException(status_code=404, detail="Upload session not found; call /init first")
    if chunk_index < 0 or total_chunks < 1 or chunk_index >= total_chunks:
        raise HTTPException(status_code=400, detail="Invalid chunk_index or total_chunks")
    max_chunk = settings.UPLOAD_CHUNK_SIZE_BYTES * 2  # allow some flexibility
    content = await chunk_file.read()
    if len(content) > max_chunk:
        raise HTTPException(
            status_code=413,
            detail=f"Chunk size exceeds maximum ({max_chunk} bytes)",
        )
    file_path = dir_path / safe_name
    mode = "wb" if chunk_index == 0 else "ab"
    async with aiofiles.open(file_path, mode) as f:
        await f.write(content)
    return JSONResponse(status_code=200, content={"received": chunk_index})


@router.post("/finalize")
async def upload_finalize(
    background_tasks: BackgroundTasks,
    task_id: str = Form(...),
    task_name: Optional[str] = Form(None),
    files: str = Form(...),  # JSON array of { filename, total_chunks, size }
):
    """
    Finalize chunked upload: verify files and start NodeODM processing.
    """
    import json as _json
    dir_path = _upload_dir() / task_id
    if not dir_path.exists():
        raise HTTPException(status_code=404, detail="Upload session not found")
    try:
        file_list = _json.loads(files)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid files JSON")
    saved_files = []
    for entry in file_list:
        fn = entry.get("filename")
        size = entry.get("size")
        if not fn:
            continue
        safe_name = _sanitize_filename(fn)
        ext = Path(safe_name).suffix.lower()
        if ext not in settings.ALLOWED_IMAGE_EXTENSIONS and ext not in settings.ALLOWED_AUXILIARY_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File {safe_name} has unsupported extension (allowed: images {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}; auxiliary {', '.join(settings.ALLOWED_AUXILIARY_EXTENSIONS)})",
            )
        file_path = dir_path / safe_name
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"File not found: {safe_name}")
        if size is not None and file_path.stat().st_size != int(size):
            raise HTTPException(
                status_code=400,
                detail=f"File size mismatch for {safe_name}",
            )
        saved_files.append(str(file_path))
    if not saved_files:
        raise HTTPException(status_code=400, detail="No valid files to process")
    try:
        n = Node("localhost", 3000)
        orthophoto_options = {
            # --- REQUIRED FOR MULTISPECTRAL ---
            'radiometric-calibration': 'camera',   # Convert to reflectance
            'feature-quality': 'high',           # Improves feature detection
            'matcher-type': 'flann',               # Stable matching across bands
            'min-num-features': 8000,
            'ignore-gsd': True,                    # Prevent band GSD mismatch failures

            # --- ORTHOPHOTO SETTINGS ---
            'skip-3dmodel': True,                  # We only need orthophoto
            'orthophoto-resolution': 5.0,          # Adjust to your desired GSD (cm/pixel)
            'orthophoto-no-tiled': False,          # Keep tiled GeoTIFF

            # --- STABILITY ---
            'texturing-skip-global-seam-leveling': True,

            # --- PERFORMANCE (minimal point cloud) ---
            'pc-quality': 'lowest',
            'orthophoto-png': True,
        }
        name = (task_name or "").strip()
        if name:
            task = n.create_task(saved_files, options=orthophoto_options, name=name)
        else:
            task = n.create_task(saved_files, options=orthophoto_options)
        nodeodm_task_id = task.uuid
        background_tasks.add_task(FileStorageService().poll_for_download, task, task_id)
        return JSONResponse(
            status_code=201,
            content={
                "message": "Files uploaded successfully, processing started",
                "task_id": task_id,
                "nodeodm_task_id": nodeodm_task_id,
                "file_count": len(saved_files),
                "status": "processing",
                "files": [Path(p).name for p in saved_files],
                "created_at": datetime.utcnow().isoformat(),
                "task_name": task_name or None,
            },
        )
    except Exception as e:
        if "ConnectionRefusedError" in str(e) or "No connection could be made" in str(e):
            raise HTTPException(
                status_code=503,
                detail="NodeODM server is not running. Please start NodeODM on localhost:3000",
            )
        raise HTTPException(status_code=500, detail=f"NodeODM processing failed: {str(e)}")


@router.get("/{task_id}/status")
async def get_upload_status(task_id: str):
    """
    Get upload status for a specific NodeODM task
    
    Args:
        task_id: NodeODM task identifier
        
    Returns:
        Current task status from NodeODM
    """
    try:
        n = Node('localhost', 3000)
        task = n.get_task(task_id)
        return JSONResponse(
            status_code=200,
            content={
                "status": str(task.info().status),
                "progress": str(task.info().progress)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")


@router.delete("/{task_id}")
async def delete_upload(task_id: str):
    """
    Delete a NodeODM task
    
    Args:
        task_id: NodeODM task identifier
        
    Returns:
        Deletion confirmation
    """
    pass

# Step 4: List all NodeODM tasks
@router.get("/")
async def list_uploads():
    """
    List all NodeODM tasks
    
    Returns:
        List of all NodeODM tasks
    """
    pass