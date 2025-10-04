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
    # Generate unique task ID
    task_id = str(uuid.uuid4())
    
    # Basic validation
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 50:  # Reasonable limit, adjust as needed
        raise HTTPException(status_code=400, detail="Too many files (maximum 50)")

    files_to_post = {
        'images[]': files
    }
    # Create task in Node ODM
    response = requests.post(f"{os.getenv('NODEODM_URL')}/task/new", files=files_to_post)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to create task in Node ODM")

    task_data = response.json()
    task_id = task_data['id']
    return JSONResponse(
            status_code=201,
            content={
                "message": "Files uploaded successfully",
                "task_id": task_id,
                "file_count": len(files),
                "status": "uploaded",
                "files": [f.filename for f in files],
                "created_at": datetime.utcnow().isoformat()
            }
        )
    # Create task directory
    task_dir = Path(f"uploads/{task_id}")
    task_dir.mkdir(parents=True, exist_ok=True)
    
    saved_files = []
    
    try:
        # Save each file
        for file in files:
            # Validate file
            if not file.filename:
                raise HTTPException(status_code=400, detail="File with no filename detected")
            
            # Check file size (100MB limit)
            file_size = 0
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
            
            # Save file
            file_path = task_dir / file.filename
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            saved_files.append(str(file_path))
        
        # TODO: Save task to database
        # TODO: Start background processing
        
        return JSONResponse(
            status_code=201,
            content={
                "message": "Files uploaded successfully",
                "task_id": task_id,
                "file_count": len(files),
                "status": "uploaded",
                "files": [f.filename for f in files],
                "created_at": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        # Cleanup on error
        if task_dir.exists():
            import shutil
            shutil.rmtree(task_dir)
        
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Step 2: Get upload status
@router.get("/{task_id}/status")
async def get_upload_status(task_id: str):
    """
    Get upload status for a specific task
    
    Args:
        task_id: Unique task identifier
        
    Returns:
        Current upload status
    """
    # TODO: Query database for task status
    # For now, check if directory exists
    task_dir = Path(f"uploads/{task_id}")
    
    if not task_dir.exists():
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Count files in directory
    files = list(task_dir.glob("*"))
    
    return {
        "task_id": task_id,
        "status": "uploaded",
        "file_count": len(files),
        "files": [f.name for f in files],
        "message": "Upload completed successfully"
    }

# Step 3: Delete uploaded files
@router.delete("/{task_id}")
async def delete_upload(task_id: str):
    """
    Delete uploaded files for a specific task
    
    Args:
        task_id: Unique task identifier
        
    Returns:
        Deletion confirmation
    """
    task_dir = Path(f"uploads/{task_id}")
    
    if not task_dir.exists():
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        import shutil
        shutil.rmtree(task_dir)
        return {
            "message": "Files deleted successfully",
            "task_id": task_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")

# Step 4: List all uploads (for debugging)
@router.get("/")
async def list_uploads():
    """
    List all uploaded tasks (for debugging)
    
    Returns:
        List of all tasks
    """
    uploads_dir = Path("uploads")
    
    if not uploads_dir.exists():
        return {"tasks": []}
    
    tasks = []
    for task_dir in uploads_dir.iterdir():
        if task_dir.is_dir():
            files = list(task_dir.glob("*"))
            tasks.append({
                "task_id": task_dir.name,
                "file_count": len(files),
                "files": [f.name for f in files],
                "created_at": datetime.fromtimestamp(task_dir.stat().st_ctime).isoformat()
            })
    
    return {"tasks": tasks}