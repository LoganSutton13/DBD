# Pathing API: shapefile upload for path preview, RTK base, save to task.
# Routes delegate to handlers; response shapes match schemas for OpenAPI.

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request, UploadFile

from app.api.deps import (
    get_file_storage_service,
    get_path_jobs_dir,
    get_path_jobs_store_dep,
    get_rtk_base_config_path,
    get_shapefile_extensions,
)
from app.core.config import settings
from app.handlers import pathing as pathing_handlers
from app.schemas.pathing import (
    PathJobAcceptedResponse,
    PathJobResultResponse,
    PathJobStatusResponse,
    PathSaveResponse,
    RtkBaseResponse,
    RtkBaseUpdate,
)

router = APIRouter()


@router.get("/rtk-base", response_model=RtkBaseResponse)
def get_rtk_base(
    rtk_base_config_path=Depends(get_rtk_base_config_path),
):
    """Return stored RTK base station coordinates (longitude, latitude). Defaults to (0, 0) if not set."""
    return pathing_handlers.get_rtk_base(rtk_base_config_path)


@router.put("/rtk-base", response_model=RtkBaseResponse)
def set_rtk_base(
    body: RtkBaseUpdate,
    rtk_base_config_path=Depends(get_rtk_base_config_path),
):
    """Save RTK base station coordinates. Valid ranges: longitude [-180, 180], latitude [-90, 90]."""
    return pathing_handlers.set_rtk_base(
        rtk_base_config_path, body.longitude, body.latitude
    )


@router.post("/", response_model=PathJobAcceptedResponse, status_code=202)
async def upload_shape_files(
    request: Request,
    background_tasks: BackgroundTasks,
    path_jobs_dir=Depends(get_path_jobs_dir),
    rtk_base_config_path=Depends(get_rtk_base_config_path),
    path_jobs_store=Depends(get_path_jobs_store_dep),
    shapefile_extensions=Depends(get_shapefile_extensions),
    heading: float = Form(0.0),
    robot_width: float = Form(0.0),
    coverage_width: float = Form(0.0),
    boundary_name: Optional[str] = Form(None),
    base_lon: Optional[float] = Form(None),
    base_lat: Optional[float] = Form(None),
):
    """
    Upload shapefile components for path generation (preview only). Returns immediately
    with a path_job_id. Only the most recent job is kept in memory. Poll status then
    GET result for waypoints. To persist the path, call POST /{path_job_id}/save with
    task_id after linking to a stitched field.
    """
    form = await request.form()
    files: List[UploadFile] = list(form.getlist("files"))

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    if len(files) > settings.PATH_JOB_MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files (maximum {settings.PATH_JOB_MAX_FILES})",
        )
    try:
        return await pathing_handlers.upload_shape_files(
            background_tasks,
            path_jobs_dir,
            rtk_base_config_path,
            path_jobs_store,
            shapefile_extensions,
            settings.PATH_JOB_MAX_FILE_SIZE_BYTES,
            files,
            heading,
            robot_width,
            coverage_width,
            boundary_name,
            base_lon,
            base_lat,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{path_job_id}/status", response_model=PathJobStatusResponse)
def get_path_job_status(
    path_job_id: str,
    path_jobs_store=Depends(get_path_jobs_store_dep),
):
    """Poll for path job status. Returns status: processing | completed | failed."""
    try:
        return pathing_handlers.get_path_job_status(path_job_id, path_jobs_store)
    except KeyError:
        raise HTTPException(status_code=404, detail="Path job not found")


@router.get("/{path_job_id}", response_model=PathJobResultResponse)
def get_path_job_result(
    path_job_id: str,
    path_jobs_store=Depends(get_path_jobs_store_dep),
):
    """
    Get path job result. When status is completed, returns waypoints and metadata
    for frontend preview. When processing or failed, returns status (and error if failed).
    """
    try:
        return pathing_handlers.get_path_job_result(path_job_id, path_jobs_store)
    except KeyError:
        raise HTTPException(status_code=404, detail="Path job not found")


@router.post("/{path_job_id}/save", response_model=PathSaveResponse)
def save_path_to_task(
    path_job_id: str,
    background_tasks: BackgroundTasks,
    task_id: str = Form(...),
    path_jobs_store=Depends(get_path_jobs_store_dep),
    storage=Depends(get_file_storage_service),
):
    """
    Persist the generated path to a NodeODM task (stitched field). Call this only when
    the farmer has linked the path to a task and chosen to save. If the task has an
    orthophoto and no prescription file yet, prescription generation is started in
    the background (skipped if prescription.geojson already exists).
    """
    try:
        from pathlib import Path
        result = pathing_handlers.save_path_to_task(
            path_job_id,
            task_id,
            path_jobs_store,
            Path(settings.RESULTS_DIR),
        )
        # If this task has an orthophoto but no prescription yet, we now have boundary + orthophoto → run prescription.
        if (
            background_tasks
            and storage.get_orthophoto_tif_path(task_id)
            and not storage.get_prescription_path(task_id)
        ):
            background_tasks.add_task(storage.run_prescription_job, task_id)
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="Path job not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
