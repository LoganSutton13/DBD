"""Results API request/response schemas."""

from typing import Optional

from pydantic import BaseModel


class TaskSummaryResponse(BaseModel):
    taskId: str
    orthophotoPngUrl: Optional[str] = None
    reportPdfUrl: Optional[str] = None
    robotPathUrl: Optional[str] = None
    displayPathUrl: Optional[str] = None


class TaskResultItem(BaseModel):
    """Item in list results response."""
    taskId: str
    orthophotoPngUrl: str
    reportPdfUrl: str
    taskName: Optional[str] = None
    robotPathUrl: Optional[str] = None
    displayPathUrl: Optional[str] = None


class DisplayPathPoint(BaseModel):
    lat: float
    lon: float


class DisplayPathResponse(BaseModel):
    taskId: str
    frame: str
    crs: str
    units: str
    waypoints: list[DisplayPathPoint]


class RobotPathRawPoint(BaseModel):
    x: float
    y: float


class RobotPathRawResponse(BaseModel):
    taskId: str
    frame: str
    crs: str
    units: str
    waypoints: list[RobotPathRawPoint]

class DeleteTaskResultsResponse(BaseModel):
    message: str
    taskId: str
    deleted: bool