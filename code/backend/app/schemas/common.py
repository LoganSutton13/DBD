"""Common / health schemas."""

from pydantic import BaseModel


class RootResponse(BaseModel):
    """Root endpoint response."""
    message: str
    status: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
