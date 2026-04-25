# Drone Imagery Backend API

A FastAPI-based backend service for processing drone imagery using Node ODM.

## Quick Start

### Prerequisites

- Python 3.8+
- Node ODM service running (Docker or local installation)

### Installation

#### Option 1: Using Poetry (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd code/backend
   ```

2. Install Poetry (if not already installed):
   ```bash
   # On Windows (PowerShell)
   (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
   
   # On macOS/Linux
   curl -sSL https://install.python-poetry.org | python3 -
   ```

3. Install dependencies and create virtual environment:
   ```bash
   poetry install
   ```

4. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. Run the development server:
   ```bash
   poetry run python run.py
   # Or activate the virtual environment first:
   poetry shell
   python run.py
   ```

#### Option 2: Using pip (Alternative)

1. Navigate to the backend directory:
   ```bash
   cd code/backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. Run the development server:
   ```bash
   python run.py
   ```

## Project Structure

```
code/backend/
├── app/
│   ├── main.py                 # FastAPI app; includes upload, results, pathing, prescription routers
│   ├── core/config.py
│   ├── api/v1/
│   │   ├── upload.py          # Chunked upload init/chunk/finalize, settings, boundary
│   │   ├── results.py         # List assets, orthophoto/PDF, paths, robot zip, delete results
│   │   ├── pathing.py         # Path jobs, RTK base, from-task generation
│   │   └── prescription.py    # Prescription list/detail/config/status/generate
│   ├── handlers/              # Route handlers (upload, results, pathing, prescription)
│   ├── services/              # File storage, path planning (Fields2Cover), field_map_generator (R)
│   └── schemas/
├── uploads/                   # Staging uploads (see UPLOAD_DIR)
├── results/                   # Processed tasks (see RESULTS_DIR)
├── path_jobs/                 # Preview path job working dirs (see PATH_JOBS_DIR)
├── requirements.txt
├── env.example
├── run.py
└── README.md
```

## Configuration

The application uses environment variables for configuration. Copy `env.example` to `.env` and modify as needed:

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8001 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `DEBUG` | True | Debug mode |
| `ALLOWED_ORIGINS` | http://localhost:3000,http://localhost:3001 | CORS allowed origins |
| `UPLOAD_DIR` | ./uploads | Directory for uploaded files |
| `RESULTS_DIR` | ./results | Directory for processed results |
| `MAX_FILE_SIZE` | 104857600 | Maximum file size in bytes (100MB) |
| `SUPPORTED_FORMATS` | image/jpeg,image/png,image/tiff | Supported file formats |
| `NODEODM_URL` | http://localhost:3000 | Node ODM service URL |
| `NODEODM_TIMEOUT` | 3600 | Node ODM timeout in seconds |

### Example .env file:
```env
PORT=8001
HOST=0.0.0.0
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8000
UPLOAD_DIR=./uploads
RESULTS_DIR=./results
MAX_FILE_SIZE=104857600
SUPPORTED_FORMATS=image/jpeg,image/png,image/tiff
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Architecture

### Data Flow
1. **Upload**: Client calls **`init` → `chunk` (repeat) → `finalize`** under `/api/v1/upload` with optional task name and NodeODM parameters; optional boundary multipart upload per task.
2. **Processing**: Finalize enqueues Node ODM; status is polled via `/api/v1/upload/{task_id}/status`.
3. **Polling / download**: Backend services poll NodeODM and pull assets into `results/{task_id}/` when complete.
4. **Results**: Orthophoto, PDF, optional prescription GeoJSON, robot path JSON, and display path JSON are exposed under `/api/v1/results` (and related routes).
5. **Pathing / prescriptions**: Separate routers cover preview path jobs, saving paths to tasks, prescription CRUD, regeneration, and configuration.

### Key Components
- **FastAPI**: Modern, fast web framework with automatic documentation
- **Pydantic Settings**: Environment-based configuration management
- **File Management**: Organized storage and validation
- **CORS**: Configured for frontend communication

## 🔗 API Endpoints

### Upload Endpoints
- `POST /api/v1/upload/init` — Start a session; returns `task_id`
- `POST /api/v1/upload/chunk` — Upload one file chunk (multipart)
- `POST /api/v1/upload/finalize` — Commit file manifest and start NodeODM
- `POST /api/v1/upload/{task_id}/boundary` — Attach boundary shapefile parts to a task
- `GET/PUT /api/v1/upload/settings` — System defaults (NodeODM + prescription knobs)
- `POST /api/v1/upload/settings/reset` (+ `/reset/prescription`, `/reset/nodeodm`) — Scoped resets
- `GET /api/v1/upload/{task_id}/status` — NodeODM-linked status for the task
- `DELETE /api/v1/upload/{task_id}` — **501** (not implemented)
- `GET /api/v1/upload/` — **501** (not implemented)

### Results Endpoints
- `GET /api/v1/results` — List processed tasks with orthophotos
- `GET /api/v1/results/{task_id}` — Task summary with asset URLs
- `GET /api/v1/results/{task_id}/orthophoto.png` — Orthophoto PNG
- `GET /api/v1/results/{task_id}/report.pdf` — ODM report PDF
- `GET /api/v1/results/{task_id}/robot-path` — Robot-frame path JSON
- `GET /api/v1/results/{task_id}/display-path` — Map (EPSG:4326) waypoints
- `GET /api/v1/results/{task_id}/robot-files.zip` — Zip of available robot_path / prescription / config files
- `DELETE /api/v1/results/{task_id}` — Delete on-disk results for the task

### Pathing Endpoints
- `POST /api/v1/pathing` — Multipart shapefile upload → preview path job (**202**)
- `POST /api/v1/pathing/from-task` (and related `.../jobs/from-task` alias) — Path job from stored task boundary
- `GET /api/v1/pathing/{path_job_id}/status` — Job status
- `GET /api/v1/pathing/{path_job_id}` — Completed preview coordinates/metadata
- `POST /api/v1/pathing/{path_job_id}/save` — Persist preview path onto a task
- `GET/PUT /api/v1/pathing/rtk-base` — RTK base station JSON config

### Prescription Endpoints
- `GET /api/v1/prescription` — List tasks with prescription artifacts
- `GET /api/v1/prescription/{task_id}` — Prescription GeoJSON
- `PUT /api/v1/prescription/{task_id}` — Update GeoJSON (spray levels, etc.)
- `GET /api/v1/prescription/{task_id}/status` — Generation status
- `GET/PUT /api/v1/prescription/{task_id}/config` — Read/write merged prescription parameters (including GPA fields)
- `POST /api/v1/prescription/{task_id}/generate` — Trigger regeneration (**202**)

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## 🧪 Testing the API

### Using curl:
Uploads use a chunked flow: init → upload each chunk → finalize.

```bash
# 1. Initialize a chunked upload (returns task_id)
curl -X POST "http://localhost:8001/api/v1/upload/init" \
  -F "task_name=My Task"

# 2. Upload each chunk (repeat for every chunk of every file)
# Use task_id from init; chunk_index 0..total_chunks-1; total_chunks = ceil(file_size / 5MB)
curl -X POST "http://localhost:8001/api/v1/upload/chunk" \
  -F "task_id=<task_id_from_init>" \
  -F "filename=image.jpg" \
  -F "chunk_index=0" \
  -F "total_chunks=3" \
  -F "chunk=@chunk0.bin"

# 3. Finalize (starts NodeODM processing)
curl -X POST "http://localhost:8001/api/v1/upload/finalize" \
  -F "task_id=<task_id_from_init>" \
  -F 'files=[{"filename":"image.jpg","total_chunks":3,"size":12345678}]'

# Check upload status (use nodeodm_task_id from finalize response)
curl -X GET "http://localhost:8001/api/v1/upload/{task_id}/status"

# List all processed results
curl -X GET "http://localhost:8001/api/v1/results"

# Get task summary
curl -X GET "http://localhost:8001/api/v1/results/{task_id}"

# Download orthophoto
curl -X GET "http://localhost:8001/api/v1/results/{task_id}/orthophoto.png" -o orthophoto.png

# Download report
curl -X GET "http://localhost:8001/api/v1/results/{task_id}/report.pdf" -o report.pdf
```

### Using Swagger UI:
1. Start the server: `python run.py`
2. Open http://localhost:8001/docs
3. Use the interactive interface to test endpoints

## Development Status

### Implemented (Sprint 2)
- ✅ Basic FastAPI application structure
- ✅ File upload endpoint with validation and task naming
- ✅ Environment-based configuration
- ✅ CORS configuration for frontend
- ✅ File size and type validation (up to 200 files per batch)
- ✅ Task ID generation and tracking
- ✅ Upload status checking
- ✅ Node ODM integration for image processing
- ✅ Background task processing with automatic polling
- ✅ Result delivery endpoints (orthophoto and PDF reports)
- ✅ File storage service with manifest management
- ✅ Automatic asset downloading upon task completion
- ✅ Task metadata storage in manifest files
- ✅ Configurable Node ODM options (orthophoto resolution, quality)
- ✅ Enhanced error handling for Node ODM connection issues
- ✅ Logging and monitoring

### Added Since Sprint 2 (highlights through Sprint 6)
- ✅ Chunked upload API (`init` / `chunk` / `finalize`) with upload settings and boundary attach
- ✅ Pathing API (preview jobs, from-task, save-to-task) and RTK base endpoints
- ✅ Prescription API (list, GeoJSON, PUT updates, config, status, **generate**)
- ✅ Results extensions: **robot-path**, **display-path**, **robot-files.zip**, **DELETE** results
- ✅ Expanded `pytest` coverage and GitHub Actions **backend-tests** workflow
- ✅ Dockerized backend with FIELDimageR / geospatial dependencies (see repository `Dockerfile`s)

### Planned / not yet implemented
- [ ] Database integration for task persistence and querying
- [ ] `DELETE` / `GET` list on `/api/v1/upload` (still **501**)
- [ ] Authentication and multi-tenant authorization
- [ ] Pagination for large results listings
- [ ] Dedicated public “NDVI-only” API separate from the prescription pipeline (NDVI lives in prescription GeoJSON today)
- [ ] Broad HTTP-level integration / E2E tests in CI (beyond unit tests)

## Integration

Typical local dev ports (see root `README.md` for Docker):
- **Frontend (CRA):** http://localhost:8000 — set `REACT_APP_API_BASE_URL=http://localhost:8001`
- **Backend:** http://localhost:8001 — set `PORT=8001` in `.env` (matches `env.example`)
- **CORS:** include every browser origin you use (defaults in `app/core/config.py` already list `localhost:8000`)

## Development

### Running in Development Mode

#### With Poetry:
```bash
poetry run python run.py
# Or activate the virtual environment:
poetry shell
python run.py
```

#### With pip:
```bash
python run.py
```

### Running with Custom Settings
```bash
# Set environment variables
export PORT=8001
export DEBUG=True
poetry run python run.py
```

### Poetry Commands

```bash
# Install dependencies
poetry install

# Add a new dependency
poetry add package-name

# Add a development dependency
poetry add --group dev package-name

# Update dependencies
poetry update

# Show dependency tree
poetry show --tree

# Activate virtual environment
poetry shell

# Run commands in virtual environment
poetry run python script.py

# Export requirements.txt (for compatibility)
poetry export -f requirements.txt --output requirements.txt
```

### Project Dependencies
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Pydantic Settings**: Configuration management
- **aiofiles**: Async file operations
- **pyodm**: Python client for Node ODM integration
- **python-multipart**: Support for file uploads

## 📝 TODO (maintainer backlog)

- [ ] Optional database layer for tasks, audit trails, and multi-user deployments
- [ ] Implement `DELETE /api/v1/upload/{task_id}` and listing if product needs upload-session management
- [ ] More integration / E2E tests (API chains and/or browser automation)
- [ ] Authentication / reverse-proxy hardening patterns for non-lab deployments
- [ ] Pagination and caching for very large farms or long result histories

## Sprint 2 Updates

### New Features
- **Results API**: Complete API for retrieving processed orthophotos and PDF reports
- **File Storage Service**: Automated polling, asset downloading, and manifest management
- **Task Naming**: Users can name tasks during upload for better organization
- **Enhanced Upload**: Support for heading and grid size parameters
- **Background Polling**: Automatic monitoring of task completion
- **Manifest System**: Metadata storage for tasks with task names and timestamps

### Improvements
- Enhanced error handling for Node ODM connection issues
- Improved logging for task status updates
- Better file organization in results directory
- Automatic asset downloading upon task completion
- Support for PNG orthophoto output
- Configurable processing options (resolution, quality, point cloud quality)