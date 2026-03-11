"""Route tests via FastAPI TestClient. No running server required."""


def test_health_root_returns_200_and_message_status(client):
    """GET / returns 200 with message and status."""
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "status" in data
    assert data["status"] == "healthy"


def test_health_health_endpoint_returns_200_and_service(client):
    """GET /health returns 200 with status and service."""
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_pathing_get_rtk_base_returns_defaults(client):
    """GET /api/v1/pathing/rtk-base returns 200 with longitude/latitude (0,0 when no config)."""
    r = client.get("/api/v1/pathing/rtk-base")
    assert r.status_code == 200
    data = r.json()
    assert data["longitude"] == 0.0
    assert data["latitude"] == 0.0


def test_pathing_put_rtk_base_accepts_valid_body(client):
    """PUT /api/v1/pathing/rtk-base with valid body returns 200 and same values."""
    r = client.put("/api/v1/pathing/rtk-base", json={"longitude": 10.0, "latitude": 20.0})
    assert r.status_code == 200
    data = r.json()
    assert data["longitude"] == 10.0
    assert data["latitude"] == 20.0


def test_pathing_put_rtk_base_invalid_body_returns_422(client):
    """PUT /api/v1/pathing/rtk-base with invalid body returns 422."""
    r = client.put("/api/v1/pathing/rtk-base", json={"longitude": 10.0})  # missing latitude
    assert r.status_code == 422
    r2 = client.put("/api/v1/pathing/rtk-base", json={"longitude": 10.0, "latitude": 100.0})  # lat > 90
    assert r2.status_code == 422


def test_pathing_get_status_unknown_id_returns_404(client):
    """GET /api/v1/pathing/{id}/status with unknown id returns 404."""
    r = client.get("/api/v1/pathing/unknown-job-id/status")
    assert r.status_code == 404


def test_pathing_get_result_unknown_id_returns_404(client):
    """GET /api/v1/pathing/{id} with unknown id returns 404."""
    r = client.get("/api/v1/pathing/unknown-job-id")
    assert r.status_code == 404


def test_pathing_post_save_unknown_id_returns_404(client):
    """POST /api/v1/pathing/{id}/save with unknown id returns 404."""
    r = client.post("/api/v1/pathing/unknown-job-id/save", data={"task_id": "task-1"})
    assert r.status_code == 404


def test_pathing_post_upload_no_files_returns_400(client):
    """POST /api/v1/pathing/ with no files returns 400."""
    r = client.post("/api/v1/pathing/", data={"heading": "0", "robot_width": "0", "coverage_width": "0"})
    assert r.status_code == 400


def test_pathing_post_upload_too_many_files_returns_400(client):
    """POST /api/v1/pathing/ with more than max files returns 400."""
    files = [("files", (f"f{i}.shp", b"content")) for i in range(21)]
    data = {"heading": "0", "robot_width": "0", "coverage_width": "0"}
    r = client.post("/api/v1/pathing/", data=data, files=files)
    assert r.status_code == 400


def test_pathing_post_upload_wrong_extension_returns_400(client):
    """POST /api/v1/pathing/ with disallowed file extension returns 400."""
    files = [("files", ("document.pdf", b"content"))]
    data = {"heading": "0", "robot_width": "0", "coverage_width": "0"}
    r = client.post("/api/v1/pathing/", data=data, files=files)
    assert r.status_code == 400


def test_upload_post_init_returns_200_and_task_id(client):
    """POST /api/v1/upload/init returns 200 with task_id."""
    r = client.post("/api/v1/upload/init", data={})
    assert r.status_code == 200
    data = r.json()
    assert "task_id" in data
    assert len(data["task_id"]) > 0


def test_upload_post_chunk_valid_returns_200_and_received(client):
    """POST /api/v1/upload/chunk with valid form and chunk returns 200 with received."""
    init_r = client.post("/api/v1/upload/init", data={})
    assert init_r.status_code == 200
    task_id = init_r.json()["task_id"]
    r = client.post(
        "/api/v1/upload/chunk",
        data={
            "task_id": task_id,
            "filename": "image.jpg",
            "chunk_index": "0",
            "total_chunks": "1",
        },
        files={"chunk": ("image.jpg", b"small chunk content")},
    )
    assert r.status_code == 200
    assert r.json()["received"] == 0


def test_upload_post_chunk_session_not_found_returns_404(client):
    """POST /api/v1/upload/chunk with wrong task_id returns 404."""
    r = client.post(
        "/api/v1/upload/chunk",
        data={
            "task_id": "nonexistent-task-id",
            "filename": "x.jpg",
            "chunk_index": "0",
            "total_chunks": "1",
        },
        files={"chunk": ("x.jpg", b"data")},
    )
    assert r.status_code == 404


def test_upload_post_finalize_invalid_json_returns_400(client):
    """POST /api/v1/upload/finalize with invalid files JSON returns 400."""
    init_r = client.post("/api/v1/upload/init", data={})
    task_id = init_r.json()["task_id"]
    r = client.post(
        "/api/v1/upload/finalize",
        data={"task_id": task_id, "files": "not valid json"},
    )
    assert r.status_code == 400


def test_upload_post_finalize_session_not_found_returns_404(client):
    """POST /api/v1/upload/finalize with nonexistent task_id returns 404."""
    r = client.post(
        "/api/v1/upload/finalize",
        data={"task_id": "nonexistent-task-id", "files": "[]"},
    )
    assert r.status_code == 404


def test_upload_get_list_returns_501(client):
    """GET /api/v1/upload/ returns 501."""
    r = client.get("/api/v1/upload/")
    assert r.status_code == 501


def test_upload_delete_returns_501(client):
    """DELETE /api/v1/upload/{task_id} returns 501."""
    r = client.delete("/api/v1/upload/some-task-id")
    assert r.status_code == 501


def test_results_get_list_returns_200_empty_list(client):
    """GET /api/v1/results/ returns 200 and list (empty when no tasks)."""
    r = client.get("/api/v1/results/")
    assert r.status_code == 200
    assert r.json() == []


def test_results_get_task_summary_no_results_returns_404(client):
    """GET /api/v1/results/{task_id} when no results returns 404."""
    r = client.get("/api/v1/results/nonexistent-task")
    assert r.status_code == 404


def test_results_get_orthophoto_not_found_returns_404(client):
    """GET /api/v1/results/{task_id}/orthophoto.png when not found returns 404."""
    r = client.get("/api/v1/results/nonexistent-task/orthophoto.png")
    assert r.status_code == 404
