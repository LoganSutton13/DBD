"""
Results API endpoints for drone imagery files
"""

from fastapi import APIRouter, Request, HTTPException
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
async def get_task_summary(task_id: str, request: Request):
    """
    Summary info for a processed task including URLs to assets.
    """
    try:
        image_path = file_storage_service.get_image_path(task_id)
        report_path = file_storage_service.get_report_path(task_id)

        if not image_path and not report_path:
            raise HTTPException(status_code=404, detail="No results found for task")

        base_url = str(request.base_url).rstrip('/')
        result = {"taskId": task_id}
        if image_path:
            result["orthophotoPngUrl"] = f"{base_url}/api/v1/results/{task_id}/orthophoto.png"
        if report_path:
            result["reportPdfUrl"] = f"{base_url}/api/v1/results/{task_id}/report.pdf"

        return JSONResponse(status_code=200, content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task results: {str(e)}")

@router.get("/")
async def list_processed_files(request: Request):
    """
    List all processed tasks that have an orthophoto PNG.
    """
    try:
        tasks = file_storage_service.list_tasks_with_orthophoto()
        # Items already include relative URLs; return as-is
        return JSONResponse(status_code=200, content=tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get all processed tasks: {str(e)}")

@router.get("/{task_id}/orthophoto.png")
async def get_orthophoto_png(task_id: str):
    """Serve the orthophoto PNG for a task."""
    image_path = file_storage_service.get_image_path(task_id)
    if not image_path:
        raise HTTPException(status_code=404, detail="Orthophoto PNG not found")
    return FileResponse(path=image_path, media_type="image/png", filename="orthophoto.png")

@router.get("/{task_id}/report.pdf")
async def get_report_pdf(task_id: str):
    """Serve the PDF report for a task if available."""
    report_path = file_storage_service.get_report_path(task_id)
    if not report_path:
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path=report_path, media_type="application/pdf", filename="report.pdf")