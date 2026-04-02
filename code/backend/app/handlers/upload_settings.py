"""Upload settings persistence and NodeODM option mapping."""

import json
from pathlib import Path
from typing import Any, Dict

from app.schemas.upload_settings import (
    NodeOdmSettings,
    UploadSettingsResponse,
    UploadSettingsUpdate,
)

DEFAULT_UPLOAD_SETTINGS: Dict[str, Any] = {
    "robot_width": 2.0,
    "coverage_width": 6.0,
    "nodeodm": {
        "radiometric_calibration": "camera",
        "feature_quality": "high",
        "matcher_type": "flann",
        "min_num_features": 8000,
        "ignore_gsd": True,
        "skip_3dmodel": True,
        "orthophoto_resolution": 5.0,
        "orthophoto_no_tiled": False,
        "texturing_skip_global_seam_leveling": True,
        "pc_quality": "high",
        "orthophoto_png": True,
    },
}


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            merged[key] = _deep_merge(base[key], value)
        else:
            merged[key] = value
    return merged


def _read_settings_file(upload_settings_config_path: Path) -> Dict[str, Any]:
    if not upload_settings_config_path.exists():
        return {}
    try:
        with open(upload_settings_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _write_settings_file(upload_settings_config_path: Path, data: Dict[str, Any]) -> None:
    upload_settings_config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(upload_settings_config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_upload_settings(upload_settings_config_path: Path) -> UploadSettingsResponse:
    stored = _read_settings_file(upload_settings_config_path)
    merged = _deep_merge(DEFAULT_UPLOAD_SETTINGS, stored)
    merged.setdefault("nodeodm", {})
    # Always enforce required PNG output for current system assumptions.
    merged["nodeodm"]["orthophoto_png"] = True
    return UploadSettingsResponse.model_validate(merged)


def update_upload_settings(
    upload_settings_config_path: Path, body: UploadSettingsUpdate
) -> UploadSettingsResponse:
    current = get_upload_settings(upload_settings_config_path).model_dump()
    incoming = body.model_dump(exclude_unset=True)
    merged = _deep_merge(current, incoming)
    merged.setdefault("nodeodm", {})
    merged["nodeodm"]["orthophoto_png"] = True
    validated = UploadSettingsResponse.model_validate(merged)
    _write_settings_file(upload_settings_config_path, validated.model_dump())
    return validated


def reset_upload_settings(upload_settings_config_path: Path) -> UploadSettingsResponse:
    defaults = UploadSettingsResponse.model_validate(DEFAULT_UPLOAD_SETTINGS)
    _write_settings_file(upload_settings_config_path, defaults.model_dump())
    return defaults


def get_nodeodm_task_options(upload_settings_config_path: Path) -> Dict[str, Any]:
    settings = get_upload_settings(upload_settings_config_path)
    nodeodm: NodeOdmSettings = settings.nodeodm
    return {
        "radiometric-calibration": nodeodm.radiometric_calibration,
        "feature-quality": nodeodm.feature_quality,
        "matcher-type": nodeodm.matcher_type,
        "min-num-features": nodeodm.min_num_features,
        "ignore-gsd": nodeodm.ignore_gsd,
        "skip-3dmodel": nodeodm.skip_3dmodel,
        "orthophoto-resolution": nodeodm.orthophoto_resolution,
        "orthophoto-no-tiled": nodeodm.orthophoto_no_tiled,
        "texturing-skip-global-seam-leveling": nodeodm.texturing_skip_global_seam_leveling,
        "pc-quality": nodeodm.pc_quality,
        "orthophoto-png": True,
    }
