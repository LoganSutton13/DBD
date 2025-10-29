# app/services/file_storage.py
"""
File storage service for handling NodeODM output files
"""

import os
import shutil
import time
import asyncio
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import hashlib
import pyodm
import logging

from ..core.config import settings
LOGGER = logging.getLogger(__name__)
COMPLETED_STATUS = 'taskstatus.completed'
FAILED_STATUS = 'taskstatus.failed'
class FileStorageService:
    """Service for managing NodeODM output file storage"""
    
    def __init__(self):
        self.results_dir = Path(settings.RESULTS_DIR)
        self.results_dir.mkdir(parents=True, exist_ok=True)

    async def poll_for_download(self, task : pyodm.Task, task_id: str) -> Path | None:
        """Poll for the download of the NodeODM task"""
        while True:
            status = str(task.info().status).lower()
            LOGGER.info(f"Polling for task {task_id} status: {status}")
            
            if status == COMPLETED_STATUS:
                LOGGER.info(f"Downloading assets for task {task_id}")
                try:
                    return task.download_assets(destination = self.results_dir / task_id)
                except PermissionError as e:
                    LOGGER.error(f"Permission error downloading assets (Windows file lock): {e}")
                    # Files were likely downloaded but couldn't be cleaned up, which is okay
                    # Return the directory path anyway
                    task_dir = self.results_dir / task_id
                    if task_dir.exists():
                        return task_dir
                    raise

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
        
        stored_files = {}
        
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
    
    def get_file_path(self, task_id: str, file_name: str) -> Optional[Path]:
        """Get local path for a stored file"""
        file_path = self.results_dir / task_id / file_name
        return file_path if file_path.exists() else None
    
    def list_stored_files(self, task_id: str) -> List[Dict[str, str]]:
        """List all stored files for a task"""
        task_dir = self.results_dir / task_id
        if not task_dir.exists():
            return []
        
        files = []
        for file_path in task_dir.iterdir():
            if file_path.is_file():
                files.append({
                    'name': file_path.name,
                    'path': str(file_path),
                    'size': file_path.stat().st_size,
                    'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
        
        return files

# Create service instance
file_storage_service = FileStorageService()