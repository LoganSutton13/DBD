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

# Step 1: Basic file upload endpoint
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
    
    if len(files) > 50:  # Reasonable limit, adjust as needed
        raise HTTPException(status_code=400, detail="Too many files (maximum 50)")

    # Generate temporary task ID for file organization
    temp_task_id = str(uuid.uuid4())
    temp_dir = Path(f"temp_uploads/{temp_task_id}")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
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
            file_path = temp_dir / file.filename
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            saved_files.append(str(file_path))
        
        # Create NodeODM task with saved file paths
        n = Node('localhost', 3000)
        task = n.create_task(saved_files)
        nodeodm_task_id = task.uuid  # Get NodeODM's auto-generated ID
        
        task.wait_for_completion(status_callback=lambda info: print(f"Task status: {info.status}"))
        
        # Clean up temporary files after processing
        import shutil
        shutil.rmtree(temp_dir)
        
        return JSONResponse(
            status_code=201,
            content={
                "message": "Files uploaded successfully and processing completed",
                "task_id": nodeodm_task_id,  # Using NodeODM's ID as the main task ID
                "file_count": len(files),
                "status": "completed",
                "files": [f.filename for f in files],
                "created_at": datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        # Clean up temporary files on error
        if temp_dir.exists():
            import shutil
            shutil.rmtree(temp_dir)
        
        # Handle NodeODM connection errors gracefully
        if "ConnectionRefusedError" in str(e) or "No connection could be made" in str(e):
            raise HTTPException(
                status_code=503, 
                detail="NodeODM server is not running. Please start NodeODM on localhost:3000"
            )
        else:
            raise HTTPException(status_code=500, detail=f"NodeODM processing failed: {str(e)}")

# Step 2: Get upload status
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
        # Query NodeODM for task status
        n = Node('localhost', 3000)
        task_info = n.get_task(task_id)
        
        return {
            "task_id": task_id,
            "status": task_info.status,
            "progress": getattr(task_info, 'progress', 0),
            "message": "Task status retrieved from NodeODM"
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Task not found: {str(e)}")

# Step 3: Delete NodeODM task
@router.delete("/{task_id}")
async def delete_upload(task_id: str):
    """
    Delete a NodeODM task
    
    Args:
        task_id: NodeODM task identifier
        
    Returns:
        Deletion confirmation
    """
    try:
        # Delete task from NodeODM
        n = Node('localhost', 3000)
        n.delete_task(task_id)
        
        return {
            "message": "Task deleted successfully from NodeODM",
            "task_id": task_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")

# Step 4: List all NodeODM tasks
@router.get("/")
async def list_uploads():
    """
    List all NodeODM tasks
    
    Returns:
        List of all NodeODM tasks
    """
    try:
        # Get all tasks from NodeODM
        n = Node('localhost', 3000)
        tasks = n.get_tasks()
        
        task_list = []
        for task in tasks:
            task_list.append({
                "task_id": task.uuid,
                "status": task.status,
                "progress": getattr(task, 'progress', 0),
                "created_at": getattr(task, 'date_created', 'unknown')
            })
        
        return {"tasks": task_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tasks: {str(e)}")