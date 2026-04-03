"""Prescription API endpoints. Routes delegate to handlers; response shapes match schemas."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.api.deps import get_file_storage_service
from app.handlers import prescription as prescription_handlers
from app.schemas.prescription import (
    PrescriptionListResponse,
    PrescriptionStatusResponse,
    PrescriptionUpdateRequest,
)
from app.schemas.prescription_config import PrescriptionConfig

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PrescriptionListResponse)
def list_prescriptions(
    storage=Depends(get_file_storage_service),
):
    """List all tasks that have a prescription file."""
    try:
        return prescription_handlers.list_prescriptions(storage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}/config", response_model=PrescriptionConfig)
def get_prescription_config(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Return per-task prescription configuration (merged JSON), or defaults if none."""
    try:
        return prescription_handlers.get_prescription_config(task_id, storage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}/status", response_model=PrescriptionStatusResponse)
def get_prescription_status(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """
    Return status for prescription generation for a task.

    This is intended for polling from the frontend, similar to the orthophoto
    stitching status endpoint.
    """
    try:
        return prescription_handlers.get_prescription_status(task_id, storage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}")
def get_prescription(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Return prescription GeoJSON for a task. 404 if not found."""
    try:
        geojson = prescription_handlers.get_prescription(task_id, storage)
        return JSONResponse(
            content=geojson,
            media_type="application/geo+json",
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}")
def update_prescription(
    task_id: str,
    body: PrescriptionUpdateRequest,
    storage=Depends(get_file_storage_service),
):
    """Apply farmer spray choices to prescription GeoJSON; returns updated GeoJSON."""
    try:
        geojson = prescription_handlers.update_prescription(task_id, body, storage)
        return JSONResponse(
            content=geojson,
            media_type="application/geo+json",
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.exception("Failed to update prescription for task %s due to invalid GeoJSON.", task_id)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update prescription: {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}/config", response_model=PrescriptionConfig)
def set_prescription_config(
    task_id: str,
    body: PrescriptionConfig,
    storage=Depends(get_file_storage_service),
):
    """Set or merge per-task configuration for the prescription module."""
    try:
        return prescription_handlers.set_prescription_config(task_id, body, storage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
