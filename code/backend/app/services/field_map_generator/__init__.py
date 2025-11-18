"""
Field map generator service for creating NDVI maps from drone imagery
"""

from .r_wrapper import RScriptRunner, run_field_shape_auto

__all__ = ["RScriptRunner", "run_field_shape_auto"]

