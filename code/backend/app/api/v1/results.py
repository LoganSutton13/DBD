"""
Results API endpoints for drone imagery files
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
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
@router.Get("/{task_id}")
async def get_processed_files(task_id: str):
    """
    Get a NodeODM processed task
    """
    try:
        n = Node('localhost', 3000)
        task = n.get_task(task_id)
        task.info().status == "completed":

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task results: {str(e)}")
    