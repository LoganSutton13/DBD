"""
Results API endpoints for drone imagery files.
Routes delegate to handlers; response shapes match schemas for OpenAPI.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from starlette.responses import Response

from app.api.deps import get_file_storage_service
from app.handlers import results as results_handlers
from app.schemas.results import (
    DeleteTaskResultsResponse,
    DisplayPathResponse,
    RobotPathRawResponse,
    TaskResultItem,
    TaskSummaryResponse,
)

router = APIRouter()


@router.get("/{task_id}", response_model=TaskSummaryResponse)
def get_task_summary(
    task_id: str,
    request: Request,
    storage=Depends(get_file_storage_service),
):
    """Summary info for a processed task including URLs to assets."""
    try:
        base_url = str(request.base_url).rstrip("/")
        return results_handlers.get_task_summary(task_id, storage, base_url)
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task results: {str(e)}")


@router.get("/", response_model=List[TaskResultItem])
def list_processed_files(
    storage=Depends(get_file_storage_service),
):
    """List all processed tasks that have an orthophoto PNG."""
    try:
        return results_handlers.list_processed_files(storage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get all processed tasks: {str(e)}")


@router.get("/{task_id}/orthophoto.png")
def get_orthophoto_png(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Serve the orthophoto PNG for a task."""
    image_path = results_handlers.get_orthophoto_path(task_id, storage)
    if not image_path:
        raise HTTPException(status_code=404, detail="Orthophoto PNG not found")
    return FileResponse(
        path=image_path, media_type="image/png", filename="orthophoto.png"
    )


@router.get("/{task_id}/report.pdf")
def get_report_pdf(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Serve the PDF report for a task if available."""
    report_path = results_handlers.get_report_path(task_id, storage)
    if not report_path:
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(
        path=report_path,
        media_type="application/pdf",
        filename="report.pdf",
        headers={"Content-Disposition": "inline; filename=report.pdf"},
    )


@router.get("/{task_id}/robot-path", response_model=RobotPathRawResponse)
def get_robot_path(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Return robot-native path coordinates for a task."""
    try:
        return results_handlers.get_robot_path(task_id, storage)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Robot path not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get robot path: {str(e)}")


@router.get("/{task_id}/display-path", response_model=DisplayPathResponse)
def get_display_path(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Return map display path coordinates (EPSG:4326) for a task."""
    try:
        return results_handlers.get_display_path(task_id, storage)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Display path not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get display path: {str(e)}")


@router.get("/{task_id}/robot-files.zip")
def get_robot_files_zip(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Download available robot-related task files as a zip archive."""
    try:
        payload, included, missing = results_handlers.get_robot_files_zip(task_id, storage)
        headers = {
            "Content-Disposition": f'attachment; filename="{task_id}_robot_files.zip"',
            "X-Included-Files": ",".join(included),
            "X-Missing-Files": ",".join(missing),
            "Access-Control-Expose-Headers": "Content-Disposition, X-Included-Files, X-Missing-Files",
        }
        return Response(content=payload, media_type="application/zip", headers=headers)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build robot files zip: {str(e)}") from e

@router.delete("/{task_id}", response_model=DeleteTaskResultsResponse)
def delete_task_results(
    task_id: str,
    storage=Depends(get_file_storage_service),
):
    """Delete all results for a task."""
    try:
        return results_handlers.delete_task_results(task_id, storage)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete task results: {str(e)}")