"""Per-task configuration schema for the prescription module."""

from typing import Optional

from pydantic import BaseModel


class PrescriptionConfig(BaseModel):
    """Configuration for running the prescription R module for a task."""

    heading: Optional[float] = None
    cell_size: Optional[float] = None
    cluster_count: Optional[int] = None
    smoothing_rounds: Optional[int] = None
    smoothing_sigma: Optional[int] = None
    maximum_vertices: Optional[int] = None
    ndvi_threshold: Optional[float] = None

