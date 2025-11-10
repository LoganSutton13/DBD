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
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── core/                   # Core configuration
│   │   ├── __init__.py
│   │   └── config.py          # Settings and configuration
│   ├── api/                   # API endpoints
│   │   ├── __init__.py
│   │   └── v1/                # API version 1
│   │       ├── __init__.py
│   │       ├── upload.py      # File upload endpoints
│   │       └── results.py     # Results retrieval endpoints
│   └── services/              # Service layer
│       ├── __init__.py
│       └── file_storage.py   # File storage and polling service
├── uploads/                   # Uploaded files storage
├── results/                   # Processed results storage
├── requirements.txt           # Python dependencies
├── env.example               # Environment variables template
├── run.py                    # Development server runner
└── README.md                 # This file
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
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
SUPPORTED_FORMATS=image/jpeg,image/png,image/tiff
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Architecture

### Data Flow
1. **Upload**: Files uploaded via `/api/v1/upload` with optional task name and parameters
2. **Processing**: Task submitted to Node ODM with configurable options
3. **Polling**: Background polling monitors task completion automatically
4. **Download**: Assets downloaded automatically upon completion
5. **Results**: Processed orthophotos and reports retrieved via `/api/v1/results`

### Key Components
- **FastAPI**: Modern, fast web framework with automatic documentation
- **Pydantic Settings**: Environment-based configuration management
- **File Management**: Organized storage and validation
- **CORS**: Configured for frontend communication

## 🔗 API Endpoints

### Upload Endpoints
- `POST /api/v1/upload` - Upload drone imagery files with optional task name and parameters (heading, grid size)
- `GET /api/v1/upload/{task_id}/status` - Check upload/processing status
- `DELETE /api/v1/upload/{task_id}` - Delete uploaded files (planned)
- `GET /api/v1/upload` - List all uploads (debug)

### Results Endpoints
- `GET /api/v1/results` - List all processed tasks with orthophotos
- `GET /api/v1/results/{task_id}` - Get task summary with URLs to assets
- `GET /api/v1/results/{task_id}/orthophoto.png` - Serve orthophoto PNG image
- `GET /api/v1/results/{task_id}/report.pdf` - Serve PDF report

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## 🧪 Testing the API

### Using curl:
```bash
# Upload a file
curl -X POST "http://localhost:8001/api/v1/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@your_image.jpg"

# Check upload status
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

### Planned Features
- [ ] Database integration for task persistence
- [ ] Task deletion functionality
- [ ] Authentication and security
- [ ] Comprehensive unit and integration tests
- [ ] Pagination for results listing
- [ ] Caching mechanisms for frequently accessed files
- [ ] Task scheduling and queue management
- [ ] Field maps backend integration
- [ ] Pesticide prescription backend integration

## Integration

The backend is designed to work with the frontend React application:
- Frontend runs on port 3000/3001 (configurable)
- Backend runs on port 8000 (configurable via .env)
- CORS configured for frontend communication

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

## 📝 TODO

- [ ] Add database models and migrations for persistent storage
- [ ] Implement task deletion functionality
- [ ] Create comprehensive unit and integration tests
- [ ] Implement authentication and security
- [ ] Add pagination for results listing
- [ ] Implement caching mechanisms for improved performance
- [ ] Add task scheduling and queue management
- [ ] Field maps backend integration
- [ ] Pesticide prescription backend integration
- [ ] Robot path generation functionality

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