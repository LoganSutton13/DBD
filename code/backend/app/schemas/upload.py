"""Upload API request/response schemas. Field names match current API contract."""

from typing import List, Optional

from pydantic import BaseModel


class UploadInitResponse(BaseModel):
    task_id: str


class ChunkReceivedResponse(BaseModel):
    received: int


class UploadFinalizeResponse(BaseModel):
    message: str
    task_id: str
    nodeodm_task_id: str
    file_count: int
    status: str
    files: List[str]
    created_at: str
    task_name: Optional[str] = None


class TaskStatusResponse(BaseModel):
    """NodeODM task status (GET /{task_id}/status)."""
    status: str
    progress: str


class BoundaryUploadResponse(BaseModel):
    message: str
    task_id: str
    file_count: int
    files: List[str]
