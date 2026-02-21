# The purpose of this API is to handle the uploads of shape files for path preview.
# The farmer can adjust heading and regenerate until satisfied. Only the most recent
# path job is kept in memory for preview. Paths are persisted to disk only when the
# farmer links the path to a NodeODM task (stitched field) and clicks Save.

import asyncio
import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.path_planning_module.path_generator import PathGenerator

logger = logging.getLogger(__name__)

router = APIRouter()

# Base directory for path generation jobs (shapefiles + outputs)
PATH_JOBS_DIR = Path("path_jobs")
PATH_JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Only the most recent path job is kept in memory (single entry for preview).
_path_jobs: Dict[str, Dict[str, Any]] = {}

# Allowed shapefile component extensions (must include .shp)
SHAPEFILE_EXTENSIONS = {".shp", ".shx", ".dbf", ".prj", ".cpg", ".qix", ".sbn", ".sbx"}


def _run_path_generation_sync(job_dir: Path, heading: float, robot_width: float, coverage_width: float) -> Dict[str, Any]:
    """Synchronous path generation (runs in thread). Returns result dict or raises."""
    shp_files = list(job_dir.glob("*.shp"))
    if not shp_files:
        raise ValueError("No .shp file found in uploaded shapefile components")
    shapefile_path = shp_files[0]
    csv_path = job_dir / "path.csv"
    farmng_path = job_dir / "track.json"

    generator = PathGenerator(
        pid=0,
        shapefile_path=shapefile_path,
        farmng_track_file=farmng_path,
        csv_output_path=csv_path,
        heading=heading,
        robot_width=robot_width,
        coverage_width=coverage_width,
    )
    generator.generate_path()
    generator.convert_path_to_farmng()

    if generator.waypoints is None:
        raise ValueError("Path generated but waypoints not available")
    x_list, y_list, _ = generator.waypoints  # x=lon, y=lat per PathGenerator
    waypoints = [{"lat": float(y_list[i]), "lon": float(x_list[i])} for i in range(len(x_list))]
    return {
        "waypoints": waypoints,
        "heading": heading,
        "generated_at": None,  # set by caller
    }


async def _run_path_generation_task(path_job_id: str, job_dir: Path, heading: float, robot_width : float, coverage_width : float) -> None:
    """Background task: run path generation and update job store. No persistence to results/ here."""
    store = _path_jobs.get(path_job_id)
    if not store or store.get("status") != "processing":
        return
    try:
        result = await asyncio.to_thread(_run_path_generation_sync, job_dir, heading, robot_width, coverage_width)
        result["generated_at"] = datetime.utcnow().isoformat()
        store["status"] = "completed"
        store["waypoints"] = result["waypoints"]
        store["heading"] = result["heading"]
        store["generated_at"] = result["generated_at"]
        store["error"] = None
        store["job_dir"] = str(job_dir)
    except Exception as e:
        logger.exception("Path generation failed for job %s", path_job_id)
        store["status"] = "failed"
        store["error"] = str(e)
        store["waypoints"] = None
        store["heading"] = None
        store["generated_at"] = None


@router.post("/")
async def upload_shape_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    heading: float = Form(0.0),
    robot_width: float = Form(0.0),
    coverage_width: float = Form(0.0),
    boundary_name: Optional[str] = Form(None),
):
    """
    Upload shapefile components for path generation (preview only). Returns immediately
    with a path_job_id. Only the most recent job is kept in memory. Poll status then
    GET result for waypoints. To persist the path, call POST /{path_job_id}/save with
    task_id after linking to a stitched field.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Too many files (maximum 20)")

    path_job_id = str(uuid.uuid4())
    job_dir = PATH_JOBS_DIR / path_job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    saved_names: List[str] = []

    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File with no filename detected")
        ext = Path(file.filename).suffix.lower()
        if ext not in SHAPEFILE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.filename}. Allowed: {', '.join(SHAPEFILE_EXTENSIONS)}",
            )
        content = await file.read()
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File {file.filename} exceeds 100MB",
            )
        file_path = job_dir / file.filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        saved_names.append(file.filename)

    shp_count = sum(1 for n in saved_names if n.lower().endswith(".shp"))
    if shp_count == 0:
        for p in job_dir.iterdir():
            p.unlink()
        job_dir.rmdir()
        raise HTTPException(status_code=400, detail="At least one .shp file is required")

    # Only keep the most recent path job in memory (preview); any previous job is evicted.
    _path_jobs.clear()
    _path_jobs[path_job_id] = {
        "status": "processing",
        "error": None,
        "waypoints": None,
        "heading": heading,
        "robot_width": robot_width,
        "coverage_width": coverage_width,
        "generated_at": None,
        "boundary_name": boundary_name,
        "files": saved_names,
    }

    background_tasks.add_task(_run_path_generation_task, path_job_id, job_dir, heading, robot_width, coverage_width)

    return JSONResponse(
        status_code=202,
        content={
            "message": "Path generation started",
            "path_job_id": path_job_id,
            "status": "processing",
            "heading": heading,
            "robot_width": robot_width,
            "coverage_width": coverage_width,
            "files": saved_names,
            "boundary_name": boundary_name,
        },
    )


@router.get("/{path_job_id}/status")
async def get_path_job_status(path_job_id: str):
    """Poll for path job status. Returns status: processing | completed | failed."""
    if path_job_id not in _path_jobs:
        raise HTTPException(status_code=404, detail="Path job not found")
    store = _path_jobs[path_job_id]
    out = {"status": store["status"]}
    if store.get("error"):
        out["error"] = store["error"]
    return out


@router.get("/{path_job_id}")
async def get_path_job_result(path_job_id: str):
    """
    Get path job result. When status is completed, returns waypoints and metadata
    for frontend preview. When processing or failed, returns status (and error if failed).
    """
    if path_job_id not in _path_jobs:
        raise HTTPException(status_code=404, detail="Path job not found")
    store = _path_jobs[path_job_id]
    status = store["status"]
    if status == "processing":
        return {"status": "processing", "message": "Path generation in progress"}
    if status == "failed":
        return {
            "status": "failed",
            "error": store.get("error", "Unknown error"),
        }
    # completed
    return {
        "status": "completed",
        "waypoints": store["waypoints"],
        "heading": store["heading"],
        "generated_at": store["generated_at"],
        "boundary_name": store.get("boundary_name"),
        "robot_width": store.get("robot_width"),
        "coverage_width": store.get("coverage_width"),
    }


@router.post("/{path_job_id}/save")
async def save_path_to_task(path_job_id: str, task_id: str = Form(...)):
    """
    Persist the generated path to a NodeODM task (stitched field). Call this only when
    the farmer has linked the path to a task and chosen to save. Copies the FarmNG
    track JSON into results/<task_id>/robot_path.json.
    """
    if path_job_id not in _path_jobs:
        raise HTTPException(status_code=404, detail="Path job not found")
    store = _path_jobs[path_job_id]
    if store.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail="Path is not ready to save (status: {})".format(store.get("status") or "unknown"),
        )
    task_id = task_id.strip()
    if not task_id:
        raise HTTPException(status_code=400, detail="task_id is required")

    job_dir = store.get("job_dir")
    if not job_dir:
        raise HTTPException(status_code=500, detail="Path job directory not found")
    track_src = Path(job_dir) / "track.json"
    if not track_src.exists():
        raise HTTPException(status_code=404, detail="Generated track file not found")

    from app.core.config import settings
    results_dir = Path(settings.RESULTS_DIR)
    task_dir = results_dir / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    dest = task_dir / "robot_path.json"
    shutil.copy2(track_src, dest)
    logger.info("Saved robot_path.json to task folder %s", task_dir)

    return {"message": "Path saved to task", "task_id": task_id, "saved_path": str(dest)}