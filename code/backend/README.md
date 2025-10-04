# Drone Imagery Backend API

A FastAPI-based backend service for processing drone imagery using Node ODM.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node ODM service running (Docker or local installation)

### Installation

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
   # Or with uvicorn directly:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## 📁 Project Structure

```
code/backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── core/                   # Core configuration
│   │   ├── __init__.py
│   │   └── config.py          # Settings and configuration
│   └── api/                   # API endpoints
│       ├── __init__.py
│       └── v1/                # API version 1
│           ├── __init__.py
│           └── upload.py      # File upload endpoints
├── uploads/                   # Uploaded files storage
├── requirements.txt           # Python dependencies
├── env.example               # Environment variables template
├── run.py                    # Development server runner
└── README.md                 # This file
```

## 🔧 Configuration

The application uses environment variables for configuration. Copy `env.example` to `.env` and modify as needed:

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `DEBUG` | True | Debug mode |
| `ALLOWED_ORIGINS` | http://localhost:3000,http://localhost:3001 | CORS allowed origins |
| `UPLOAD_DIR` | ./uploads | Directory for uploaded files |
| `MAX_FILE_SIZE` | 104857600 | Maximum file size in bytes (100MB) |
| `SUPPORTED_FORMATS` | image/jpeg,image/png,image/tiff | Supported file formats |

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

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🏗️ Architecture

### Data Flow
1. **Upload**: Files uploaded via `/api/v1/upload`
2. **Processing**: Task submitted to Node ODM (planned)
3. **Results**: Processed field maps retrieved (planned)

### Key Components
- **FastAPI**: Modern, fast web framework with automatic documentation
- **Pydantic Settings**: Environment-based configuration management
- **File Management**: Organized storage and validation
- **CORS**: Configured for frontend communication

## 🔗 API Endpoints

### Upload Endpoints
- `POST /api/v1/upload` - Upload drone imagery files
- `GET /api/v1/upload/{task_id}/status` - Check upload status
- `DELETE /api/v1/upload/{task_id}` - Delete uploaded files
- `GET /api/v1/upload` - List all uploads (debug)

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## 🧪 Testing the API

### Using curl:
```bash
# Upload a file
curl -X POST "http://localhost:8000/api/v1/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@your_image.jpg"

# Check upload status
curl -X GET "http://localhost:8000/api/v1/upload/{task_id}/status"

# List all uploads
curl -X GET "http://localhost:8000/api/v1/upload"
```

### Using Swagger UI:
1. Start the server: `python run.py`
2. Open http://localhost:8000/docs
3. Use the interactive interface to test endpoints

## 🚧 Development Status

### ✅ Implemented
- Basic FastAPI application structure
- File upload endpoint with validation
- Environment-based configuration
- CORS configuration for frontend
- File size and type validation
- Task ID generation and tracking
- Upload status checking
- File cleanup functionality

### 🚧 Planned Features
- [ ] Node ODM integration for image processing
- [ ] Database integration for task persistence
- [ ] Background task processing
- [ ] Result delivery endpoints
- [ ] Comprehensive error handling
- [ ] Authentication and security
- [ ] Unit and integration tests
- [ ] Logging and monitoring

## 🔗 Integration

The backend is designed to work with the frontend React application:
- Frontend runs on port 3000/3001 (configurable)
- Backend runs on port 8000 (configurable via .env)
- CORS configured for frontend communication

## 🛠️ Development

### Running in Development Mode
```bash
python run.py
```

### Running with Custom Settings
```bash
# Set environment variables
export PORT=8001
export DEBUG=True
python run.py
```

### Project Dependencies
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Pydantic Settings**: Configuration management
- **aiofiles**: Async file operations
- **httpx**: HTTP client for Node ODM integration

## 📝 TODO

- [ ] Implement Node ODM client functionality
- [ ] Add database models and migrations
- [ ] Implement task status tracking
- [ ] Add comprehensive error handling
- [ ] Create unit tests
- [ ] Add logging and monitoring
- [ ] Implement authentication
- [ ] Add file processing pipeline