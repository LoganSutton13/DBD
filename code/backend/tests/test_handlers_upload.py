"""Unit tests for upload handlers."""

from pathlib import Path

import pytest

from app.handlers import upload as upload_handlers


class FakeUploadFile:
    """Minimal UploadFile-like object for tests."""

    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self._content = content

    async def read(self) -> bytes:
        return self._content


def test_upload_init_creates_dir_and_returns_task_id(upload_dir: Path, file_storage_service):
    """upload_init creates task_id subdir and returns UploadInitResponse with task_id."""
    result = upload_handlers.upload_init(upload_dir, file_storage_service)
    assert result.task_id
    assert (upload_dir / result.task_id).exists()
    assert (upload_dir / result.task_id).is_dir()


def test_upload_init_with_task_name(upload_dir: Path, file_storage_service):
    """upload_init accepts optional task_name."""
    result = upload_handlers.upload_init(upload_dir, file_storage_service, task_name="My Task")
    assert result.task_id


@pytest.mark.asyncio
async def test_upload_chunk_first_chunk_creates_file(upload_dir: Path, file_storage_service):
    """upload_chunk with chunk_index 0 creates file and returns received=0."""
    result = upload_handlers.upload_init(upload_dir, file_storage_service)
    task_id = result.task_id
    chunk = FakeUploadFile("image.jpg", b"first chunk content")
    out = await upload_handlers.upload_chunk(
        upload_dir, task_id, "image.jpg", 0, 1, chunk, max_chunk_bytes=1024 * 1024
    )
    assert out.received == 0
    path = upload_dir / task_id / "image.jpg"
    assert path.exists()
    assert path.read_bytes() == b"first chunk content"


@pytest.mark.asyncio
async def test_upload_chunk_second_chunk_appends(upload_dir: Path, file_storage_service):
    """upload_chunk with chunk_index 1 appends and returns received=1."""
    result = upload_handlers.upload_init(upload_dir, file_storage_service)
    task_id = result.task_id
    (upload_dir / task_id / "image.jpg").write_bytes(b"first")
    chunk = FakeUploadFile("image.jpg", b"second")
    out = await upload_handlers.upload_chunk(
        upload_dir, task_id, "image.jpg", 1, 2, chunk, max_chunk_bytes=1024 * 1024
    )
    assert out.received == 1
    assert (upload_dir / task_id / "image.jpg").read_bytes() == b"firstsecond"


@pytest.mark.asyncio
async def test_upload_chunk_session_missing_raises_file_not_found(upload_dir: Path):
    """upload_chunk when session dir does not exist raises FileNotFoundError."""
    chunk = FakeUploadFile("x.jpg", b"data")
    with pytest.raises(FileNotFoundError, match="Upload session not found"):
        await upload_handlers.upload_chunk(
            upload_dir, "nonexistent-task", "x.jpg", 0, 1, chunk, max_chunk_bytes=1024
        )


@pytest.mark.asyncio
async def test_upload_chunk_invalid_chunk_index_raises_value_error(upload_dir: Path, file_storage_service):
    """upload_chunk with invalid chunk_index raises ValueError."""
    result = upload_handlers.upload_init(upload_dir, file_storage_service)
    task_id = result.task_id
    chunk = FakeUploadFile("x.jpg", b"data")
    with pytest.raises(ValueError, match="Invalid chunk_index or total_chunks"):
        await upload_handlers.upload_chunk(
            upload_dir, task_id, "x.jpg", -1, 1, chunk, max_chunk_bytes=1024
        )
    with pytest.raises(ValueError, match="Invalid chunk_index or total_chunks"):
        await upload_handlers.upload_chunk(
            upload_dir, task_id, "x.jpg", 1, 1, chunk, max_chunk_bytes=1024
        )


def test_delete_upload_raises_not_implemented():
    """delete_upload raises NotImplementedError."""
    with pytest.raises(NotImplementedError, match="Delete upload not implemented"):
        upload_handlers.delete_upload("task-1")


def test_list_uploads_raises_not_implemented():
    """list_uploads raises NotImplementedError."""
    with pytest.raises(NotImplementedError, match="List uploads not implemented"):
        upload_handlers.list_uploads()
