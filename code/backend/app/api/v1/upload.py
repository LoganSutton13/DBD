"""
Upload API endpoints for drone imagery files.
Routes delegate to handlers; response shapes match schemas for OpenAPI.
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_file_storage_service, get_upload_dir
from app.core.config import settings
from app.handlers import upload as upload_handlers
from app.schemas.upload import (
    ChunkReceivedResponse,
    TaskStatusResponse,
    UploadFinalizeResponse,
    UploadInitResponse,
)

router = APIRouter()


@router.post("/init", response_model=UploadInitResponse)
def upload_init(
    upload_dir=Depends(get_upload_dir),
    storage=Depends(get_file_storage_service),
    task_name: Optional[str] = Form(None),
    heading: Optional[str] = Form(None),
    grid_size: Optional[str] = Form(None),
):
    """
    Initialize a chunked upload. Creates task_id and directory; client then
    uploads chunks via /chunk and calls /finalize when done.
    """
    return upload_handlers.upload_init(upload_dir, storage, task_name)


@router.post("/chunk", response_model=ChunkReceivedResponse)
async def upload_chunk(
    upload_dir=Depends(get_upload_dir),
    task_id: str = Form(...),
    filename: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    chunk_file: UploadFile = File(..., alias="chunk"),
):
    """
    Upload a single chunk for a file. Chunks must be sent in order (0, 1, ..., total_chunks-1).
    """
    max_chunk = settings.UPLOAD_CHUNK_SIZE_BYTES * 2
    try:
        return await upload_handlers.upload_chunk(
            upload_dir,
            task_id,
            filename,
            chunk_index,
            total_chunks,
            chunk_file,
            max_chunk,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/finalize", response_model=UploadFinalizeResponse, status_code=201)
async def upload_finalize(
    background_tasks: BackgroundTasks,
    upload_dir=Depends(get_upload_dir),
    storage=Depends(get_file_storage_service),
    task_id: str = Form(...),
    task_name: Optional[str] = Form(None),
    files: str = Form(...),
):
    """
    Finalize chunked upload: verify files and start NodeODM processing.
    """
    try:
        return upload_handlers.upload_finalize(
            background_tasks,
            upload_dir,
            storage,
            task_id,
            files,
            task_name,
            list(settings.ALLOWED_IMAGE_EXTENSIONS),
            list(settings.ALLOWED_AUXILIARY_EXTENSIONS),
            settings.NODEODM_HOST,
            settings.NODEODM_PORT,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if "ConnectionRefusedError" in str(e) or "No connection could be made" in str(e):
            raise HTTPException(
                status_code=503,
                detail="NodeODM server is not running. Please start NodeODM on localhost:3000",
            )
        raise HTTPException(status_code=500, detail=f"NodeODM processing failed: {str(e)}")


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
def get_upload_status(
    task_id: str,
):
    """Get upload status for a specific NodeODM task."""
    try:
        return upload_handlers.get_upload_status(
            task_id,
            settings.NODEODM_HOST,
            settings.NODEODM_PORT,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")


@router.delete("/{task_id}")
def delete_upload(task_id: str):
    """Delete a NodeODM task. Not implemented."""
    try:
        upload_handlers.delete_upload(task_id)
    except NotImplementedError:
        raise HTTPException(
            status_code=501,
            detail="Delete upload not implemented",
        )


@router.get("/")
def list_uploads():
    """List all NodeODM tasks. Not implemented."""
    try:
        return upload_handlers.list_uploads()
    except NotImplementedError:
        raise HTTPException(
            status_code=501,
            detail="List uploads not implemented",
        )
