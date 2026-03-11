"""Unit tests for PathGenerator service (path planning from shapefile)."""

import os
from pathlib import Path

import pytest

from app.services.path_planning_module.path_generator import PathGenerator

# Paths relative to this test file
TEST_DIR = Path(__file__).resolve().parent
TEST_SHAPEFILE = TEST_DIR / "test_data" / "boundaries.shp"
OUTPUT_CSV = TEST_DIR / "test_data" / "test_path.csv"
OUTPUT_JSON = TEST_DIR / "test_data" / "test_track.json"


@pytest.fixture(autouse=True)
def clean_outputs():
    """Remove output files before and after each test."""
    for p in (OUTPUT_CSV, OUTPUT_JSON):
        if p.exists():
            p.unlink()
    yield
    for p in (OUTPUT_CSV, OUTPUT_JSON):
        if p.exists():
            p.unlink()


def test_generate_path_and_convert():
    """PathGenerator.generate_path and convert_path_to_farmng produce CSV and JSON."""
    if not TEST_SHAPEFILE.exists():
        pytest.skip("Test shapefile missing: tests/test_data/boundaries.shp")
    generator = PathGenerator(
        pid=1,
        shapefile_path=TEST_SHAPEFILE,
        farmng_track_file=OUTPUT_JSON,
        csv_output_path=OUTPUT_CSV,
        heading=90.0,
        robot_width=2.0,
        coverage_width=6.0,
    )
    result = generator.generate_path()
    assert result is True
    assert OUTPUT_CSV.exists()

    track_file = generator.convert_path_to_farmng()
    assert OUTPUT_JSON.exists()
    assert track_file == OUTPUT_JSON
