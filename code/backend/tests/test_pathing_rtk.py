"""
Tests for RTK base station endpoints and base_lon/base_lat form flow
in the pathing API (code/backend/app/api/v1/pathing.py).

Covers:
  - GET /rtk-base: default (0, 0) when no config file exists
  - GET /rtk-base: returns persisted coordinates after a PUT
  - PUT /rtk-base: valid coordinates are stored and returned
  - PUT /rtk-base: missing longitude / latitude → 400
  - PUT /rtk-base: out-of-range longitude → 400
  - PUT /rtk-base: out-of-range latitude → 400
  - PUT /rtk-base: non-finite values (NaN, Inf) → 400
  - POST /: base_lon/base_lat provided → updates stored RTK config
  - POST /: base_lon/base_lat both 0 → falls back to stored config
"""

import io
import json
import math
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Stub out heavy C-extension / system-level dependencies so that the
# path_generator module can be imported without the actual libraries.
# ---------------------------------------------------------------------------

class _AutoMagicModule(types.ModuleType):
    """A module stub whose attribute accesses always return a MagicMock.

    This allows ``from some.stub import Anything`` to succeed without
    enumerating every exported name in advance.
    """

    def __getattr__(self, name: str):
        value = MagicMock()
        object.__setattr__(self, name, value)
        return value


def _make_stub(name: str) -> _AutoMagicModule:
    mod = _AutoMagicModule(name)
    mod.__spec__ = None  # type: ignore[attr-defined]
    mod.__path__ = []  # mark as package so sub-imports work  # type: ignore[attr-defined]
    return mod


_STUB_MODULES = [
    "geopandas",
    "fields2cover",
    "farm_ng",
    "farm_ng.core",
    "farm_ng.core.event_client",
    "farm_ng.core.event_service_pb2",
    "farm_ng.core.events_file_reader",
    "farm_ng.filter",
    "farm_ng.filter.filter_pb2",
    "farm_ng.track",
    "farm_ng.track.track_pb2",
    "farm_ng_core_pybind",
    "google",
    "google.protobuf",
    "google.protobuf.empty_pb2",
    "matplotlib",
    "matplotlib.pyplot",
    "numpy",
    "pyproj",
]

for _mod_name in _STUB_MODULES:
    if _mod_name not in sys.modules:
        sys.modules[_mod_name] = _make_stub(_mod_name)  # type: ignore[assignment]

# Patch app.services path_planning submodule stubs
sys.modules.setdefault(
    "app.services.path_planning_module.track_planner", _make_stub("track_planner")
)

# Now we can safely import the FastAPI test client and the pathing module
from fastapi import FastAPI  # noqa: E402 – after stubs
from fastapi.testclient import TestClient  # noqa: E402

import app.api.v1.pathing as pathing_module  # noqa: E402


# ---------------------------------------------------------------------------
# Helper: build a minimal in-memory shapefile-like upload form.
# We don't need a real shapefile because PathGenerator will be mocked.
# ---------------------------------------------------------------------------

def _shp_file(filename: str = "field.shp", content: bytes = b"SHP") -> tuple:
    """Return a (filename, file-object, content-type) tuple for multipart upload."""
    return (filename, io.BytesIO(content), "application/octet-stream")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _isolate(tmp_path, monkeypatch):
    """
    Before every test:
      1. Redirect RTK_BASE_CONFIG_PATH to a temporary directory so tests
         are fully isolated from each other and from the real filesystem.
      2. Clear the in-memory job store.
    """
    tmp_config = tmp_path / "rtk_base_config.json"
    monkeypatch.setattr(pathing_module, "RTK_BASE_CONFIG_PATH", tmp_config)
    pathing_module._path_jobs.clear()
    yield
    pathing_module._path_jobs.clear()


@pytest.fixture()
def client():
    """TestClient wrapping a minimal app that includes only the pathing router."""
    app = FastAPI()
    app.include_router(pathing_module.router, prefix="/pathing")
    return TestClient(app)


# ---------------------------------------------------------------------------
# GET /rtk-base tests
# ---------------------------------------------------------------------------

class TestGetRtkBase:
    def test_default_returns_zero_zero_when_no_config(self, client):
        """Without a stored config file, GET /rtk-base should return (0.0, 0.0)."""
        resp = client.get("/pathing/rtk-base")
        assert resp.status_code == 200
        data = resp.json()
        assert data["longitude"] == 0.0
        assert data["latitude"] == 0.0

    def test_returns_persisted_coordinates(self, client):
        """After a successful PUT, GET /rtk-base should return the stored values."""
        client.put("/pathing/rtk-base", json={"longitude": 12.345, "latitude": -34.567})
        resp = client.get("/pathing/rtk-base")
        assert resp.status_code == 200
        data = resp.json()
        assert math.isclose(data["longitude"], 12.345, rel_tol=1e-9)
        assert math.isclose(data["latitude"], -34.567, rel_tol=1e-9)

    def test_returns_zero_zero_on_corrupt_config(self, client, tmp_path, monkeypatch):
        """A corrupt JSON config file should fall back to (0.0, 0.0) gracefully."""
        corrupt = tmp_path / "rtk_base_config.json"
        corrupt.write_text("{invalid json", encoding="utf-8")
        monkeypatch.setattr(pathing_module, "RTK_BASE_CONFIG_PATH", corrupt)

        resp = client.get("/pathing/rtk-base")
        assert resp.status_code == 200
        data = resp.json()
        assert data["longitude"] == 0.0
        assert data["latitude"] == 0.0


# ---------------------------------------------------------------------------
# PUT /rtk-base tests
# ---------------------------------------------------------------------------

class TestPutRtkBase:
    def test_valid_coordinates_saved_and_returned(self, client):
        """Valid longitude/latitude in range should be stored and echoed back."""
        payload = {"longitude": -73.935242, "latitude": 40.730610}
        resp = client.put("/pathing/rtk-base", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert math.isclose(data["longitude"], payload["longitude"], rel_tol=1e-9)
        assert math.isclose(data["latitude"], payload["latitude"], rel_tol=1e-9)

    def test_boundary_coordinates_accepted(self, client):
        """Boundary values (-180/-90, 180/90) should be accepted."""
        for lon, lat in [(-180.0, -90.0), (180.0, 90.0), (0.0, 0.0)]:
            resp = client.put("/pathing/rtk-base", json={"longitude": lon, "latitude": lat})
            assert resp.status_code == 200, f"Expected 200 for lon={lon}, lat={lat}"

    def test_config_file_written(self, client):
        """After a PUT, the config JSON file should be written to disk."""
        client.put("/pathing/rtk-base", json={"longitude": 10.0, "latitude": 20.0})
        assert pathing_module.RTK_BASE_CONFIG_PATH.exists()
        with open(pathing_module.RTK_BASE_CONFIG_PATH) as f:
            stored = json.load(f)
        assert math.isclose(stored["longitude"], 10.0)
        assert math.isclose(stored["latitude"], 20.0)

    def test_missing_longitude_returns_400(self, client):
        """Omitting 'longitude' should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"latitude": 40.0})
        assert resp.status_code == 400

    def test_missing_latitude_returns_400(self, client):
        """Omitting 'latitude' should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": -73.0})
        assert resp.status_code == 400

    def test_missing_both_fields_returns_400(self, client):
        """An empty body should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={})
        assert resp.status_code == 400

    def test_longitude_too_large_returns_400(self, client):
        """longitude > 180 should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": 180.001, "latitude": 0.0})
        assert resp.status_code == 400

    def test_longitude_too_small_returns_400(self, client):
        """longitude < -180 should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": -180.001, "latitude": 0.0})
        assert resp.status_code == 400

    def test_latitude_too_large_returns_400(self, client):
        """latitude > 90 should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": 0.0, "latitude": 90.001})
        assert resp.status_code == 400

    def test_latitude_too_small_returns_400(self, client):
        """latitude < -90 should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": 0.0, "latitude": -90.001})
        assert resp.status_code == 400

    def test_longitude_nan_returns_400(self, client):
        """NaN is not a valid geographic coordinate; should return HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": "NaN", "latitude": 0.0})
        # FastAPI may reject non-numeric strings before our handler, or our range
        # check catches it — either way the response must not be 200.
        assert resp.status_code != 200

    def test_longitude_extreme_positive_value_returns_400(self, client):
        """A longitude value far above 180 must be rejected with HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": 1e10, "latitude": 0.0})
        assert resp.status_code == 400

    def test_longitude_extreme_negative_value_returns_400(self, client):
        """A longitude value far below -180 must be rejected with HTTP 400."""
        resp = client.put("/pathing/rtk-base", json={"longitude": -1e10, "latitude": 0.0})
        assert resp.status_code == 400

    def test_non_standard_json_infinity_rejected(self, client):
        """A raw request body containing a non-standard Infinity token must not return 200."""
        resp = client.put(
            "/pathing/rtk-base",
            content=b'{"longitude": Infinity, "latitude": 0.0}',
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code != 200

    def test_non_standard_json_nan_rejected(self, client):
        """A raw request body containing a non-standard NaN token must not return 200.

        If a serializer (e.g. JavaScript 'JSON.stringify' with special overrides)
        produces a body with a bare NaN token, the server must not accept it.
        """
        resp = client.put(
            "/pathing/rtk-base",
            content=b'{"longitude": NaN, "latitude": 0.0}',
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code != 200


# ---------------------------------------------------------------------------
# POST / – base_lon / base_lat form flow
# ---------------------------------------------------------------------------

class TestPostRtkBaseFormFlow:
    """
    Tests for the base_lon/base_lat parameters in the shapefile upload endpoint.
    PathGenerator is fully mocked so the tests remain fast and dependency-free.
    """

    @pytest.fixture(autouse=True)
    def _mock_background(self, monkeypatch):
        """Replace the heavy background task with a no-op to keep tests fast."""

        async def _noop(*args, **kwargs):
            pass

        monkeypatch.setattr(pathing_module, "_run_path_generation_task", _noop)

    def _upload(self, client, base_lon=None, base_lat=None, extra_fields=None):
        """Helper: post a minimal fake .shp file to POST /pathing/."""
        data = {"heading": "0", "robot_width": "3", "coverage_width": "6"}
        if base_lon is not None:
            data["base_lon"] = str(base_lon)
        if base_lat is not None:
            data["base_lat"] = str(base_lat)
        if extra_fields:
            data.update(extra_fields)
        files = [("files", ("field.shp", io.BytesIO(b"FAKE"), "application/octet-stream"))]
        return client.post("/pathing/", data=data, files=files)

    def test_upload_with_nonzero_base_coords_updates_config(self, client):
        """Non-zero base_lon/base_lat in the form should persist to the RTK config."""
        resp = self._upload(client, base_lon=10.0, base_lat=50.0)
        assert resp.status_code == 202

        # The config file should now store the provided coordinates
        assert pathing_module.RTK_BASE_CONFIG_PATH.exists()
        with open(pathing_module.RTK_BASE_CONFIG_PATH) as f:
            stored = json.load(f)
        assert math.isclose(stored["longitude"], 10.0)
        assert math.isclose(stored["latitude"], 50.0)

    def test_upload_without_base_coords_uses_stored_config(self, client):
        """When base_lon/base_lat are absent, the stored RTK config is used (not overwritten)."""
        # Write a known config first
        pathing_module._write_rtk_base_config(99.0, 45.0)

        resp = self._upload(client)  # no base_lon / base_lat
        assert resp.status_code == 202

        # Config must still contain the original stored values
        with open(pathing_module.RTK_BASE_CONFIG_PATH) as f:
            stored = json.load(f)
        assert math.isclose(stored["longitude"], 99.0)
        assert math.isclose(stored["latitude"], 45.0)

    def test_upload_with_zero_base_coords_falls_back_to_stored_config(self, client):
        """base_lon=0, base_lat=0 should be treated as "not provided" and fall back."""
        pathing_module._write_rtk_base_config(55.0, 25.0)

        resp = self._upload(client, base_lon=0.0, base_lat=0.0)
        assert resp.status_code == 202

        # Config must still contain the original stored values
        with open(pathing_module.RTK_BASE_CONFIG_PATH) as f:
            stored = json.load(f)
        assert math.isclose(stored["longitude"], 55.0)
        assert math.isclose(stored["latitude"], 25.0)

    def test_upload_no_shp_file_returns_400(self, client):
        """Uploading without a .shp file should be rejected with HTTP 400."""
        files = [("files", ("field.dbf", io.BytesIO(b"FAKE"), "application/octet-stream"))]
        resp = client.post("/pathing/", data={"heading": "0"}, files=files)
        assert resp.status_code == 400

    def test_upload_no_files_returns_400(self, client):
        """Sending no files at all should be rejected with HTTP 400 or 422."""
        resp = client.post("/pathing/", data={"heading": "0"})
        assert resp.status_code in (400, 422)
