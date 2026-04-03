"""Upload settings schemas for global defaults and NodeODM overrides."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NodeOdmSettings(BaseModel):
    radiometric_calibration: str = "camera"
    feature_quality: str = "high"
    matcher_type: str = "flann"
    min_num_features: int = Field(8000, ge=1)
    ignore_gsd: bool = True
    skip_3dmodel: bool = True
    orthophoto_resolution: float = Field(5.0, gt=0)
    orthophoto_no_tiled: bool = False
    texturing_skip_global_seam_leveling: bool = True
    pc_quality: str = "high"
    # Required output; exposed as read-only semantics in API docs/UI.
    orthophoto_png: bool = True


class NodeOdmSettingsUpdate(BaseModel):
    radiometric_calibration: Optional[str] = None
    feature_quality: Optional[str] = None
    matcher_type: Optional[str] = None
    min_num_features: Optional[int] = Field(None, ge=1)
    ignore_gsd: Optional[bool] = None
    skip_3dmodel: Optional[bool] = None
    orthophoto_resolution: Optional[float] = Field(None, gt=0)
    orthophoto_no_tiled: Optional[bool] = None
    texturing_skip_global_seam_leveling: Optional[bool] = None
    pc_quality: Optional[str] = None


class PrescriptionModuleSettings(BaseModel):
    """Defaults aligned with prescription_module.R option_list (heading is per-task only, not global)."""

    model_config = ConfigDict(extra="ignore")

    cell_size: Optional[float] = None
    cluster_count: int = Field(3, ge=1)
    smoothing_rounds: int = Field(3, ge=0)
    smoothing_sigma: int = Field(10, ge=1)
    maximum_vertices: int = Field(80000, ge=1)
    ndvi_threshold: float = Field(1.0, ge=-1, le=1)


class PrescriptionModuleSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    cell_size: Optional[float] = None
    cluster_count: Optional[int] = Field(None, ge=1)
    smoothing_rounds: Optional[int] = Field(None, ge=0)
    smoothing_sigma: Optional[int] = Field(None, ge=1)
    maximum_vertices: Optional[int] = Field(None, ge=1)
    ndvi_threshold: Optional[float] = Field(None, ge=-1, le=1)


class UploadSettingsResponse(BaseModel):
    robot_width: float = Field(2.0, gt=0)
    coverage_width: float = Field(6.0, gt=0)
    nodeodm: NodeOdmSettings
    prescription: PrescriptionModuleSettings


class UploadSettingsUpdate(BaseModel):
    robot_width: Optional[float] = Field(None, gt=0)
    coverage_width: Optional[float] = Field(None, gt=0)
    nodeodm: Optional[NodeOdmSettingsUpdate] = None
    prescription: Optional[PrescriptionModuleSettingsUpdate] = None
