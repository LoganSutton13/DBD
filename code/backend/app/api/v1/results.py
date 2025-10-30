"""
Results API endpoints for drone imagery files
"""

from fastapi import APIRouter, Request, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import uuid
import os
from pathlib import Path
import aiofiles
from datetime import datetime
import requests
from dotenv import load_dotenv
from pyodm import Node
from app.services import file_storage_service

load_dotenv()

# Create router
router = APIRouter()
@router.get("/{task_id}")
async def get_processed_files(task_id: str):
    """
    Get a NodeODM processed task
    """
    try:
        image_path = file_storage_service.get_image_path(task_id)
        report_path = file_storage_service.get_report_path(task_id)
        # return the file at the file path
        return FileResponse(image_path), FileResponse(report_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task results: {str(e)}")