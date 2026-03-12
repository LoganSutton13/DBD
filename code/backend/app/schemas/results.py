"""Results API request/response schemas. Field names match current API contract."""

from typing import Optional

from pydantic import BaseModel


class TaskSummaryResponse(BaseModel):
    taskId: str
    orthophotoPngUrl: Optional[str] = None
    reportPdfUrl: Optional[str] = None


class TaskResultItem(BaseModel):
    """Item in list results response."""
    taskId: str
    orthophotoPngUrl: str
    reportPdfUrl: str
    taskName: Optional[str] = None
