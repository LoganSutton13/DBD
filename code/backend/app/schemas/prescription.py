"""Prescription API request/response schemas."""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


SprayLevel = Literal["none", "low", "high"]


class PrescriptionUpdateItem(BaseModel):
    """Single spray assignment for a feature or cluster."""
    featureId: str
    spray: SprayLevel


class PrescriptionUpdateRequest(BaseModel):
    """Request body for PUT /prescription/{task_id}."""
    updates: List[PrescriptionUpdateItem]


class PrescriptionListItem(BaseModel):
    """Item in list prescriptions response."""
    taskId: str
    taskName: Optional[str] = None
    prescriptionUrl: Optional[str] = None


class PrescriptionListResponse(BaseModel):
    """Response for GET /prescription/."""
    items: List[PrescriptionListItem]


class PrescriptionStatusResponse(BaseModel):
    """Status for prescription generation for a task."""
    taskId: str
    status: Literal["not_started", "processing", "completed", "failed"]
    message: Optional[str] = None
