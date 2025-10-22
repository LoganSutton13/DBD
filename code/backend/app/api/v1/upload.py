"""
Upload API endpoints for drone imagery files
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

load_dotenv()

# Create router
router = APIRouter()

# file upload endpoint
@router.post("/")
async def upload_files(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload drone imagery files to NodeODM for processing
    
    Args:
        files: List of uploaded image files
        background_tasks: Background task handler
        
    Returns:
        Task information with unique ID
    """
    
    # Basic validation
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 200:  # Reasonable limit, adjust as needed
        raise HTTPException(status_code=400, detail="Too many files (maximum 50)")

    # Generate temporary task ID for file organization
    task_id = str(uuid.uuid4())
    dir_path = Path(f"uploads/{task_id}")
    dir_path.mkdir(parents=True, exist_ok=True)
    
    saved_files = []
    
    try:
        # Save uploaded files to temporary directory
        for file in files:
            # Validate file
            if not file.filename:
                raise HTTPException(status_code=400, detail="File with no filename detected")
            
            # Check file size (100MB limit)
            content = await file.read()
            file_size = len(content)
            
            if file_size > 100 * 1024 * 1024:  # 100MB
                raise HTTPException(
                    status_code=413, 
                    detail=f"File {file.filename} exceeds maximum size of 100MB"
                )
            
            # Check file type
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400, 
                    detail=f"File {file.filename} is not a valid image"
                )
            
            # Save file to temporary directory
            file_path = dir_path / file.filename
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            saved_files.append(str(file_path))
        
        # Create NodeODM task with saved file paths - simple orthophoto settings
        n = Node('localhost', 3000)
        orthophoto_options = {
            'skip-3dmodel': True,  # Skip 3D model to focus on orthophoto
            'orthophoto-resolution': 3.0,  # Medium quality (3cm/pixel)
            'orthophoto-quality': 75  # Medium JPEG quality
        }
        task = n.create_task(saved_files, options=orthophoto_options)
        nodeodm_task_id = task.uuid  # Get NodeODM's auto-generated ID
        
        return JSONResponse(
            status_code=201,
            content={
                "message": "Files uploaded successfully, processing started",
                "task_id": task_id,
                "nodeodm_task_id": nodeodm_task_id,  # Using NodeODM's ID as the main task ID
                "file_count": len(files),
                "status": "processing",
                "files": [f.filename for f in files],
                "created_at": datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        # TODO:Clean up temporary files on error
        
        # Handle NodeODM connection errors gracefully
        if "ConnectionRefusedError" in str(e) or "No connection could be made" in str(e):
            raise HTTPException(
                status_code=503, 
                detail="NodeODM server is not running. Please start NodeODM on localhost:3000"
            )
        else:
            raise HTTPException(status_code=500, detail=f"NodeODM processing failed: {str(e)}")


@router.get("/{task_id}/status")
async def get_upload_status(task_id: str):
    """
    Get upload status for a specific NodeODM task
    
    Args:
        task_id: NodeODM task identifier
        
    Returns:
        Current task status from NodeODM
    """
    try:
        n = Node('localhost', 3000)
        task = n.get_task(task_id)
        return JSONResponse(
            status_code=200,
            content={
                "status": str(task.info().status),
                "progress": str(task.info().progress)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")


@router.delete("/{task_id}")
async def delete_upload(task_id: str):
    """
    Delete a NodeODM task
    
    Args:
        task_id: NodeODM task identifier
        
    Returns:
        Deletion confirmation
    """
    pass

# Step 4: List all NodeODM tasks
@router.get("/")
async def list_uploads():
    """
    List all NodeODM tasks
    
    Returns:
        List of all NodeODM tasks
    """
    pass