"""Prescription API endpoints. Routes delegate to handlers; response shapes match schemas."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.api.deps import get_file_storage_service
from app.handlers import prescription as prescription_handlers
from app.schemas.prescription import (
    PrescriptionListResponse,
    PrescriptionUpdateRequest,
)

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
