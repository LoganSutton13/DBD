"""Pathing business logic: RTK base, path job upload/status/result/save."""

import asyncio
import json
import logging
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import aiofiles
from fastapi import UploadFile

from app.schemas.pathing import (
    PathJobAcceptedResponse,
    PathJobCompletedResponse,
    PathJobFailedResponse,
    PathJobProcessingResponse,
    PathJobStatusResponse,
    PathSaveResponse,
    RtkBaseResponse,
)
from app.services.path_planning_module.path_generator import PathGenerator

logger = logging.getLogger(__name__)

# Only the most recent path job is kept in memory (single entry for preview).
_path_jobs: Dict[str, Dict[str, Any]] = {}


def get_path_jobs_store() -> Dict[str, Dict[str, Any]]:
    """Return the in-memory path jobs store (for DI)."""
    return _path_jobs


def _read_rtk_base_config(rtk_base_config_path: Path) -> Tuple[float, float]:
    """Read stored RTK base (lon, lat). Returns (0, 0) if missing or invalid."""
    if not rtk_base_config_path.exists():
        return (0.0, 0.0)
    try:
        with open(rtk_base_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        lon = float(data.get("longitude", 0))
        lat = float(data.get("latitude", 0))
        return (lon, lat)
    except (json.JSONDecodeError, TypeError, ValueError):
        return (0.0, 0.0)


def _write_rtk_base_config(rtk_base_config_path: Path, longitude: float, latitude: float) -> None:
    """Persist RTK base coordinates."""
    rtk_base_config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(rtk_base_config_path, "w", encoding="utf-8") as f:
        json.dump({"longitude": longitude, "latitude": latitude}, f, indent=2)


def _run_path_generation_sync(
    job_dir: Path,
    heading: float,
    robot_width: float,
    coverage_width: float,
    base_station_coords: Tuple[float, float],
) -> Dict[str, Any]:
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
        base_station_coords=base_station_coords,
    )
    generator.generate_path()
    generator.convert_path_to_farmng()

    if generator.waypoints is None:
        raise ValueError("Path generated but waypoints not available")
    x_list, y_list, _ = generator.waypoints
    waypoints = [{"lat": float(y_list[i]), "lon": float(x_list[i])} for i in range(len(x_list))]
    return {
        "waypoints": waypoints,
        "heading": heading,
        "generated_at": None,
    }


async def _run_path_generation_task(
    path_job_id: str,
    job_dir: Path,
    heading: float,
    robot_width: float,
    coverage_width: float,
    base_station_coords: Tuple[float, float],
    path_jobs_store: Dict[str, Dict[str, Any]],
) -> None:
    """Background task: run path generation and update job store."""
    from datetime import datetime

    store = path_jobs_store.get(path_job_id)
    if not store or store.get("status") != "processing":
        return
    try:
        result = await asyncio.to_thread(
            _run_path_generation_sync,
            job_dir,
            heading,
            robot_width,
            coverage_width,
            base_station_coords,
        )
        result["generated_at"] = datetime.utcnow().isoformat()
        store["status"] = "completed"
        store["waypoints"] = result["waypoints"]
        store["heading"] = result["heading"]
        store["generated_at"] = result["generated_at"]
        store["error"] = None
        store["job_dir"] = str(job_dir)
    except Exception as e:  # pylint: disable=broad-except
        logger.exception("Path generation failed for job %s", path_job_id)
        store["status"] = "failed"
        store["error"] = str(e)
        store["waypoints"] = None
        store["heading"] = None
        store["generated_at"] = None


def get_rtk_base(rtk_base_config_path: Path) -> RtkBaseResponse:
    """Return stored RTK base station coordinates. Defaults to (0, 0) if not set."""
    lon, lat = _read_rtk_base_config(rtk_base_config_path)
    return RtkBaseResponse(longitude=lon, latitude=lat)


def set_rtk_base(rtk_base_config_path: Path, longitude: float, latitude: float) -> RtkBaseResponse:
    """Save RTK base station coordinates."""
    _write_rtk_base_config(rtk_base_config_path, longitude, latitude)
    return RtkBaseResponse(longitude=longitude, latitude=latitude)


async def upload_shape_files(
    background_tasks: Any,
    path_jobs_dir: Path,
    rtk_base_config_path: Path,
    path_jobs_store: Dict[str, Dict[str, Any]],
    shapefile_extensions: Tuple[str, ...],
    max_file_size_bytes: int,
    files: List[UploadFile],
    heading: float,
    robot_width: float,
    coverage_width: float,
    boundary_name: Optional[str],
    base_lon: Optional[float],
    base_lat: Optional[float],
) -> PathJobAcceptedResponse:
    """Process uploaded shapefiles, start path generation, return accepted response."""
    path_job_id = str(uuid.uuid4())
    job_dir = path_jobs_dir / path_job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    saved_names: List[str] = []
    extensions_set = set(shapefile_extensions)

    for file in files:
        if not file.filename:
            raise ValueError("File with no filename detected")
        ext = Path(file.filename).suffix.lower()
        if ext not in extensions_set:
            raise ValueError(
                f"Unsupported file type: {file.filename}. Allowed: {', '.join(extensions_set)}"
            )
        content = await file.read()
        if len(content) > max_file_size_bytes:
            raise ValueError(f"File {file.filename} exceeds {max_file_size_bytes // (1024*1024)}MB")
        file_path = job_dir / file.filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        saved_names.append(file.filename)

    shp_count = sum(1 for n in saved_names if n.lower().endswith(".shp"))
    if shp_count == 0:
        for p in job_dir.iterdir():
            p.unlink()
        job_dir.rmdir()
        raise ValueError("At least one .shp file is required")

    if base_lon is not None and base_lat is not None and (base_lon != 0 or base_lat != 0):
        base_station_coords = (float(base_lon), float(base_lat))
        _write_rtk_base_config(rtk_base_config_path, base_station_coords[0], base_station_coords[1])
    else:
        base_station_coords = _read_rtk_base_config(rtk_base_config_path)

    path_jobs_store.clear()
    path_jobs_store[path_job_id] = {
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

    background_tasks.add_task(
        _run_path_generation_task,
        path_job_id,
        job_dir,
        heading,
        robot_width,
        coverage_width,
        base_station_coords,
        path_jobs_store,
    )

    return PathJobAcceptedResponse(
        message="Path generation started",
        path_job_id=path_job_id,
        status="processing",
        heading=heading,
        robot_width=robot_width,
        coverage_width=coverage_width,
        files=saved_names,
        boundary_name=boundary_name,
    )


def get_path_job_status(
    path_job_id: str, path_jobs_store: Dict[str, Dict[str, Any]]
) -> PathJobStatusResponse:
    """Return path job status (processing | completed | failed)."""
    if path_job_id not in path_jobs_store:
        raise KeyError("Path job not found")
    store = path_jobs_store[path_job_id]
    out = PathJobStatusResponse(status=store["status"], error=store.get("error"))
    return out


def get_path_job_result(
    path_job_id: str, path_jobs_store: Dict[str, Dict[str, Any]]
) -> PathJobProcessingResponse | PathJobFailedResponse | PathJobCompletedResponse:
    """Return path job result (processing, failed, or completed with waypoints)."""
    if path_job_id not in path_jobs_store:
        raise KeyError("Path job not found")
    store = path_jobs_store[path_job_id]
    status = store["status"]
    if status == "processing":
        return PathJobProcessingResponse(
            status="processing", message="Path generation in progress"
        )
    if status == "failed":
        return PathJobFailedResponse(
            status="failed", error=store.get("error", "Unknown error")
        )
    return PathJobCompletedResponse(
        status="completed",
        waypoints=store["waypoints"] or [],
        heading=store.get("heading"),
        generated_at=store.get("generated_at"),
        boundary_name=store.get("boundary_name"),
        robot_width=store.get("robot_width"),
        coverage_width=store.get("coverage_width"),
    )


def save_path_to_task(
    path_job_id: str,
    task_id: str,
    path_jobs_store: Dict[str, Dict[str, Any]],
    results_dir: Path,
) -> PathSaveResponse:
    """Persist generated path to task folder (robot_path.json)."""
    if path_job_id not in path_jobs_store:
        raise KeyError("Path job not found")
    store = path_jobs_store[path_job_id]
    if store.get("status") != "completed":
        raise ValueError(
            "Path is not ready to save (status: {})".format(store.get("status") or "unknown")
        )
    task_id = task_id.strip()
    if not task_id:
        raise ValueError("task_id is required")
    job_dir = store.get("job_dir")
    if not job_dir:
        raise ValueError("Path job directory not found")
    track_src = Path(job_dir) / "track.json"
    if not track_src.exists():
        raise FileNotFoundError("Generated track file not found")
    task_dir = results_dir / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    dest = task_dir / "robot_path.json"
    shutil.copy2(track_src, dest)
    logger.info("Saved robot_path.json to task folder %s", task_dir)
    return PathSaveResponse(
        message="Path saved to task", task_id=task_id, saved_path=str(dest)
    )
