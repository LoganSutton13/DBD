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
@router.get("/{task_id}/{file_name}")
async def get_processed_files(task_id: str, file_name: str):
    """
    Get a NodeODM processed task
    """
    try:
        file_path = file_storage_service.get_file_path(task_id, file_name)
        return FileResponse(file_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task results: {str(e)}")

@router.post("/webhook/nodeodm")
async def nodeodm_webhook(request: Request):
    try:
        webhook_data = await request.json()
        
        # Extract NodeODM task ID from webhook
        nodeodm_task_id = webhook_data.get("task_id") or webhook_data.get("uuid")
        status = webhook_data.get("status")
        
        if status == "completed":
            # Get your internal task ID (you'll need to map this)
            task_id = webhook_data.get("internal_task_id")  # You'll set this when creating task
            
            # Auto-download files
            n = Node('localhost', 3000)
            task = n.get_task(nodeodm_task_id)
            
            # Store files locally
            file_storage_service.store_nodeodm_files(task_id, task)
            
            return JSONResponse(
                status_code=200,
                content={
                    "message": "Files downloaded successfully",
                    "task_id": task_id,
                    "nodeodm_task_id": nodeodm_task_id
                }
            )
        else:
            return JSONResponse(
                status_code=200,
                content={"message": f"Task {nodeodm_task_id} status: {status}"}
            )
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to process webhook: {str(e)}"}
        )