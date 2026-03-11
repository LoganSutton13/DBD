"""Pathing API request/response schemas. Field names match current API contract."""

from typing import List, Optional, Union

from pydantic import BaseModel, Field


class Waypoint(BaseModel):
    lat: float
    lon: float


class RtkBaseResponse(BaseModel):
    longitude: float
    latitude: float


class RtkBaseUpdate(BaseModel):
    """Request body for PUT /rtk-base."""
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)


class PathJobAcceptedResponse(BaseModel):
    message: str
    path_job_id: str
    status: str
    heading: float
    robot_width: float
    coverage_width: float
    files: List[str]
    boundary_name: Optional[str] = None


class PathJobStatusResponse(BaseModel):
    status: str
    error: Optional[str] = None


class PathJobProcessingResponse(BaseModel):
    status: str = "processing"
    message: str


class PathJobFailedResponse(BaseModel):
    status: str = "failed"
    error: str


class PathJobCompletedResponse(BaseModel):
    status: str = "completed"
    waypoints: List[Waypoint]
    heading: Optional[float] = None
    generated_at: Optional[str] = None
    boundary_name: Optional[str] = None
    robot_width: Optional[float] = None
    coverage_width: Optional[float] = None


PathJobResultResponse = Union[
    PathJobProcessingResponse,
    PathJobFailedResponse,
    PathJobCompletedResponse,
]


class PathSaveResponse(BaseModel):
    message: str
    task_id: str
    saved_path: str
