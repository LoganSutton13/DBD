# app/services/file_storage.py
"""
File storage service for handling NodeODM output files
"""

import os
import shutil
import time
import asyncio
from asyncio.subprocess import PIPE
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import hashlib
import json
import logging

import pyodm

from ..core.config import settings
from ..handlers import upload_settings as upload_settings_handlers

LOGGER = logging.getLogger(__name__)

# Task status (NodeODM)
COMPLETED_STATUS = "taskstatus.completed"
FAILED_STATUS = "taskstatus.failed"

# Path segments under each task_id directory
MANIFEST_FILE = "manifest.json"
ORTHO_DIR = "odm_orthophoto"
ORTHO_FILE = "odm_orthophoto.png"
REPORT_DIR = "odm_report"
REPORT_FILE = "report.pdf"
PRESCRIPTION_FILE = "prescription.geojson"
PRESCRIPTION_STATUS_FILE = "prescription_status.json"
PRESCRIPTION_CONFIG_FILE = "prescription_config.json"
ROBOT_PATH_FILE = "robot_path.json"
DISPLAY_PATH_FILE = "display_path.geojson"
ROBOT_PATH_METADATA_FILE = "path_metadata.json"

# Local API base paths
PRESCRIPTION_BASE_PATH = "/api/v1/prescription"


class FileStorageService:
    """Service for managing NodeODM output file storage"""

    def __init__(self, results_dir: Optional[Path] = None):
        if results_dir is not None:
            self.results_dir = Path(results_dir)
        else:
            configured_results_dir = Path(settings.RESULTS_DIR)
            if configured_results_dir.is_absolute():
                self.results_dir = configured_results_dir
            else:
                backend_root = Path(__file__).resolve().parents[2]
                self.results_dir = (backend_root / configured_results_dir).resolve()
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def _result_url(self, task_id: str, artifact_name: str) -> str:
        """Build a relative API URL for a task artifact."""
        return f"/api/v1/results/{task_id}/{artifact_name}"

    def _manifest_path(self, task_id: str) -> Path:
        return self.results_dir / task_id / MANIFEST_FILE

    def write_manifest(self, task_id: str, data: Dict[str, str]) -> None:
        task_dir = self.results_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = self._manifest_path(task_id)
        try:
            import json
            with open(manifest_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            LOGGER.warning(f"Failed to write manifest for task {task_id}: {e}")

    def read_manifest(self, task_id: str) -> Optional[Dict[str, str]]:
        manifest_path = self._manifest_path(task_id)
        if not manifest_path.exists():
            return None
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            LOGGER.warning(f"Failed to read manifest for task {task_id}: {e}")
            return None

    def get_orthophoto_tif_path(self, task_id: str) -> Optional[Path]:
        """
        Return a path to the orthophoto GeoTIFF for this task, if available.
        Prefer a top-level orthophoto.tif, fall back to a tif inside odm_orthophoto.
        """
        task_dir = self.results_dir / task_id
        candidates = [
            task_dir / "orthophoto.tif",
            task_dir / ORTHO_DIR / "odm_orthophoto.tif",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None

    def find_boundary_shapefile(self, task_id: str) -> Optional[Path]:
        """
        Locate the boundary shapefile associated with this task.

        Assumes the boundary .shp (from pathing generation) is stored alongside
        other task artifacts under results_dir/task_id. First checks directly
        under the task directory, then searches recursively as a fallback.
        """
        task_dir = self.results_dir / task_id
        if not task_dir.exists():
            return None

        # Non-recursive search for a .shp next to the orthophoto and other files
        for entry in task_dir.iterdir():
            if entry.is_file() and entry.suffix.lower() == ".shp":
                return entry

        # Fallback: recursive search within the task directory
        for shp_path in task_dir.rglob("*.shp"):
            if shp_path.is_file():
                return shp_path

        return None

    def write_prescription_status(
        self,
        task_id: str,
        status: str,
        message: Optional[str] = None,
    ) -> None:
        """Persist prescription-job status for a task."""
        task_dir = self.results_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        status_path = task_dir / PRESCRIPTION_STATUS_FILE
        payload: Dict[str, Any] = {
            "taskId": task_id,
            "status": status,
        }
        if message:
            payload["message"] = message
        try:
            with open(status_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception as exc:
            LOGGER.warning("Failed to write prescription status for %s: %s", task_id, exc)

    def read_prescription_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Read persisted prescription-job status for a task, if present."""
        status_path = self.results_dir / task_id / PRESCRIPTION_STATUS_FILE
        if not status_path.exists():
            return None
        try:
            with open(status_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            LOGGER.warning("Failed to read prescription status for %s: %s", task_id, exc)
            return None

    def read_prescription_config(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Read per-task prescription configuration, if present."""
        config_path = self.results_dir / task_id / PRESCRIPTION_CONFIG_FILE
        if not config_path.exists():
            return None
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
            return None
        except Exception as exc:
            LOGGER.warning("Failed to read prescription config for %s: %s", task_id, exc)
            return None

    def write_prescription_config(self, task_id: str, config: Dict[str, Any]) -> None:
        """Write per-task prescription configuration."""
        task_dir = self.results_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        config_path = task_dir / PRESCRIPTION_CONFIG_FILE
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
        except Exception as exc:
            LOGGER.warning("Failed to write prescription config for %s: %s", task_id, exc)

    async def run_prescription_job(self, task_id: str) -> None:
        """
        Run the R-based prescription module for a completed task.

        This is intended to be called from a background context after NodeODM
        assets have been downloaded. It updates a per-task status file that can
        be polled by the frontend.
        """
        task_dir = self.results_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)

        # Mark as processing as soon as the job starts.
        self.write_prescription_status(task_id, "processing", "Running prescription module")

        orthophoto_path = self.get_orthophoto_tif_path(task_id)
        if not orthophoto_path:
            msg = "Orthophoto GeoTIFF not found; cannot run prescription module."
            LOGGER.error("Task %s: %s", task_id, msg)
            self.write_prescription_status(task_id, "failed", msg)
            return

        boundary_path = self.find_boundary_shapefile(task_id)
        if not boundary_path:
            msg = "Boundary shapefile (.shp) not found for task; pathing must be linked before prescription generation."
            LOGGER.error("Task %s: %s", task_id, msg)
            self.write_prescription_status(task_id, "failed", msg)
            return

        # Global prescription defaults (upload_settings.json) merged with per-task overrides.
        upload_settings_path = Path(settings.UPLOAD_DIR) / "upload_settings.json"
        config = upload_settings_handlers.merge_prescription_config_for_r(
            upload_settings_path,
            self.read_prescription_config(task_id),
        )

        # Allow overriding the Rscript binary path via environment variable.
        rscript_binary = os.getenv("PRESCRIPTION_RSCRIPT_PATH", "Rscript")

        # R script lives alongside this service in the field_map_generator directory.
        script_dir = Path(__file__).parent / "field_map_generator"
        script_path = script_dir / "prescription_module.R"

        if not script_path.exists():
            msg = f"Prescription script not found at {script_path}"
            LOGGER.error("Task %s: %s", task_id, msg)
            self.write_prescription_status(task_id, "failed", msg)
            return

        cmd: List[str] = [
            rscript_binary,
            str(script_path),
            "--orthophoto",
            str(orthophoto_path),
            "--boundary",
            str(boundary_path),
            "--output_file_path",
            str(task_dir),
            "--output_file_name",
            PRESCRIPTION_FILE,
        ]

        # Map Python config keys to R CLI flags.
        flag_map = {
            "heading": "--heading",
            "cell_size": "--cell_size",
            "cluster_count": "--cluster_count",
            "smoothing_rounds": "--smoothing_rounds",
            "smoothing_sigma": "--smoothing_sigma",
            "maximum_vertices": "--maximum_vertices",
            "ndvi_threshold": "--ndvi_threshold",
        }

        for key, flag in flag_map.items():
            if key in config and config[key] is not None:
                cmd.extend([flag, str(config[key])])

        LOGGER.info("Starting prescription job for task %s with command: %s", task_id, " ".join(cmd))

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(script_dir),
                stdout=PIPE,
                stderr=PIPE,
            )
        except FileNotFoundError as exc:
            msg = f"Failed to start Rscript process: {exc}"
            LOGGER.error("Task %s: %s", task_id, msg)
            self.write_prescription_status(task_id, "failed", msg)
            return

        stdout_bytes, stderr_bytes = await process.communicate()
        stdout_text = stdout_bytes.decode("utf-8", errors="ignore")
        stderr_text = stderr_bytes.decode("utf-8", errors="ignore")

        if process.returncode == 0 and (task_dir / PRESCRIPTION_FILE).exists():
            LOGGER.info("Prescription job for task %s completed successfully.", task_id)
            self.write_prescription_status(task_id, "completed", "Prescription generated successfully.")
            return

        msg = (
            f"Prescription module failed with exit code {process.returncode}. "
            f"Stderr: {stderr_text.strip() or 'no stderr output'}"
        )
        LOGGER.error("Task %s: %s", task_id, msg)
        # Optionally log stdout for debugging.
        if stdout_text.strip():
            LOGGER.debug("Task %s prescription stdout: %s", task_id, stdout_text)
        self.write_prescription_status(task_id, "failed", msg)

    async def poll_for_download(self, task : pyodm.Task, task_id: str) -> Path | None:
        """Poll for the download of the NodeODM task"""
        while True:
            status = str(task.info().status).lower()
            LOGGER.info(f"Polling for task {task_id} status: {status}")
            
            if status == COMPLETED_STATUS:
                LOGGER.info(f"Downloading assets for task {task_id}")
                try:
                    task_dir = Path(task.download_assets(destination=self.results_dir / task_id))
                except PermissionError as e:
                    LOGGER.warning(f"[Benign] Permission error downloading assets (Windows file lock): {e}")
                    # Files were likely downloaded but couldn't be cleaned up, which is okay
                    # Return the directory path anyway
                    task_dir = self.results_dir / task_id
                    if task_dir.exists():
                        # Run prescription job in the background context and then return.
                        await self.run_prescription_job(task_id)
                        return task_dir
                    raise

                # At this point assets were downloaded successfully; kick off prescription generation.
                await self.run_prescription_job(task_id)
                return task_dir

            if status == FAILED_STATUS:
                LOGGER.error(f"Task {task_id} failed. Error: {task.info().last_error}")
                return None
                
            await asyncio.sleep(5)
    
    def store_nodeodm_files(self, task_id: str, nodeodm_task: pyodm.Task) -> Path:
        """
        Store NodeODM output files locally
        
        Args:
            task_id: Our internal task ID
            nodeodm_task: NodeODM task object
            
        Returns:
            Dictionary mapping file types to local storage paths
        """
        task_dir = self.results_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
                
        # List of files to retrieve from NodeODM
        files_to_store = [
            'orthophoto.tif',
            'orthophoto.png', 
            'odm_orthophoto',
            'odm_dem',
            'odm_report',
            'odm_logs'
        ]
        
        for file_type in files_to_store:
            try:
                # Download assets from NodeODM
                pathToData : Path = Path(nodeodm_task.download_assets(destination = task_dir))
            except Exception as e:
                # Log error but continue with other files
                print(f"Failed to store {file_type}: {e}")
                continue
        
        return pathToData
    
    def get_image_path(self, task_id: str) -> Optional[Path]:
        """Get local path for a stored orthophoto PNG"""
        file_path = self.results_dir / task_id / ORTHO_DIR / ORTHO_FILE
        LOGGER.info(f"Retrieving image path: {file_path}")
        return file_path if file_path.exists() else None
    
    def get_report_path(self, task_id: str) -> Optional[Path]:
        """Get local path for a stored PDF report"""
        file_path = self.results_dir / task_id / REPORT_DIR / REPORT_FILE
        LOGGER.info(f"Retrieving report path: {file_path}")
        return file_path if file_path.exists() else None

    def get_prescription_path(self, task_id: str) -> Optional[Path]:
        """Get local path for a prescription GeoJSON file, or None if not found."""
        file_path = self.results_dir / task_id / PRESCRIPTION_FILE
        return file_path if file_path.exists() else None

    def get_robot_path_path(self, task_id: str) -> Optional[Path]:
        """Get local path for the saved robot path file, or None if missing."""
        file_path = self.results_dir / task_id / ROBOT_PATH_FILE
        return file_path if file_path.exists() else None

    def get_display_path_path(self, task_id: str) -> Optional[Path]:
        """Get local path for display path GeoJSON, or None if missing."""
        file_path = self.results_dir / task_id / DISPLAY_PATH_FILE
        return file_path if file_path.exists() else None

    def get_robot_path_metadata_path(self, task_id: str) -> Optional[Path]:
        """Get local path for robot/display path metadata JSON, or None if missing."""
        file_path = self.results_dir / task_id / ROBOT_PATH_METADATA_FILE
        return file_path if file_path.exists() else None

    def list_tasks_with_prescription(self) -> List[Dict[str, str]]:
        """Return tasks that have a prescription.geojson file."""
        tasks: List[Dict[str, str]] = []
        if not self.results_dir.exists():
            return tasks
        for task_dir in self.results_dir.iterdir():
            if not task_dir.is_dir():
                continue
            task_id = task_dir.name
            if not (task_dir / PRESCRIPTION_FILE).exists():
                continue
            item: Dict[str, str] = {
                'taskId': task_id,
                    'prescriptionUrl': f"{PRESCRIPTION_BASE_PATH}/{task_id}",
            }
            manifest = self.read_manifest(task_id)
            if manifest and isinstance(manifest, dict):
                task_name = manifest.get('task_name') or manifest.get('taskName')
                if task_name:
                    item['taskName'] = task_name
            tasks.append(item)
        return tasks

    def list_stored_files(self, task_id: str) -> List[Dict[str, str]]:
        """List all stored files for a task (non-recursive)."""
        task_dir = self.results_dir / task_id
        if not task_dir.exists():
            return []
        manifest = self.read_manifest(task_id) or {}
        task_name = manifest.get('task_name') or manifest.get('taskName') or None
        files: List[Dict[str, str]] = []
        for file_path in task_dir.iterdir():
            if file_path.is_file():
                files.append({
                    'name': file_path.name,
                    'path': str(file_path),
                    'size': file_path.stat().st_size,
                    'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    'taskId': task_id,
                    **({'taskName': task_name} if task_name else {})
                })
        return files

    def list_tasks_with_orthophoto(self) -> List[Dict[str, str]]:
        """Return tasks that have an orthophoto PNG available."""
        tasks: List[Dict[str, str]] = []
        if not self.results_dir.exists():
            return tasks
        for task_dir in self.results_dir.iterdir():
            LOGGER.info(f"task_dir: {task_dir}")
            if not task_dir.is_dir():
                LOGGER.info(f"task_dir is not a directory: {task_dir}")
                continue
            task_id = task_dir.name
            if not (task_dir / ORTHO_DIR / ORTHO_FILE).exists():
                LOGGER.info(f"orthophoto file does not exist: {task_dir / ORTHO_DIR / ORTHO_FILE}")
                continue

            item: Dict[str, str] = {
                'taskId': task_id,
                'orthophotoPngUrl': self._result_url(task_id, 'orthophoto.png'),
                'reportPdfUrl': self._result_url(task_id, 'report.pdf'),
            }
            manifest = self.read_manifest(task_id)
            if manifest and isinstance(manifest, dict):
                task_name = manifest.get('task_name') or manifest.get('taskName')
                if task_name:
                    item['taskName'] = task_name
            tasks.append(item)
            LOGGER.info(f"task appended to list: {item}")
        return tasks

    def delete_task_results(self, task_id: str) -> None:
        """Delete all results for a task."""
        task_dir = (self.results_dir / task_id).resolve()
        base_dir = self.results_dir.resolve()
        # Guard against path traversal (e.g., task_id="../../somewhere").
        if task_dir != base_dir and base_dir not in task_dir.parents:
            raise ValueError("Invalid task_id")
        if not task_dir.exists():
            raise FileNotFoundError("Task results not found")
        shutil.rmtree(task_dir)


# Create service instance
file_storage_service = FileStorageService()