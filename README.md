# DroneBasedDevelopment

## Project summary

### One-sentence description of the project

A full-stack web application that processes drone imagery through automated image stitching and orthophoto generation using Node ODM, providing farmers and agricultural professionals with high-quality field maps and analysis tools.

### Additional information about the project

DroneBasedDevelopment is a comprehensive drone imagery processing platform designed for agricultural applications. The system combines a modern React frontend with a Python FastAPI backend to provide seamless upload, processing, and visualization of drone-captured field imagery. Users can upload multiple drone images, which are automatically processed using Node ODM to create orthophotos and field maps. The platform features a dark-themed UI with real-time processing monitoring, file management, and integration with agricultural analysis tools for pesticide prescription mapping and field assessment.

## Installation

### Prerequisites

- **Node.js** (version 14 or higher) - for the React frontend
- **Python 3.8+** - for the FastAPI backend
- **Node ODM** - Docker container or local installation for image processing
- **Git** - for cloning the repository
- **Poetry** (recommended) or **pip** - for Python dependency management

### Add-ons

**Backend Dependencies:**
- **FastAPI** - Modern, fast web framework for building APIs
- **Uvicorn** - ASGI server for running the FastAPI application
- **PyODM** - Python client for Node ODM integration
- **Pydantic Settings** - Settings management using environment variables
- **aiofiles** - Async file operations for handling uploads
- **httpx** - HTTP client for Node ODM communication
- **python-multipart** - Support for file uploads

**Frontend Dependencies:**
- **React 18** - UI library with TypeScript support
- **Tailwind CSS** - Utility-first CSS framework for styling
- **react-dropzone** - Drag-and-drop file upload functionality
- **TypeScript** - Type-safe JavaScript development

### Installation Steps

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd DBD
```

#### 2. Backend Setup (Python/FastAPI)

**Option A: Using Poetry (Recommended)**
```bash
cd code/backend
poetry install
cp env.example .env
# Edit .env with your configuration
poetry run python run.py
```

**Option B: Using pip**
```bash
cd code/backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration
python run.py
```

#### 3. Frontend Setup (React)
```bash
cd code/frontend
npm install
npm start
```

#### 4. Node ODM Setup
```bash
# Using Docker (recommended)
docker run -p 3000:3000 opendronemap/nodeodm
```

#### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Node ODM**: http://localhost:3000 


## Functionality

### Core Features

**1. Image Upload & Management**
- Drag-and-drop interface for uploading multiple drone images
- Support for JPEG, PNG, and TIFF formats (up to 100MB per file)
- Real-time upload progress tracking
- File validation and error handling
- Upload queue management with preview thumbnails

**2. Automated Image Processing**
- Integration with Node ODM for professional-grade image stitching
- Automatic orthophoto generation with configurable quality settings
- Background processing with real-time status updates and automatic polling
- Task queuing and progress monitoring
- Support for large image sets (up to 200 images per batch)
- Automatic asset downloading upon task completion
- Task naming capability for better organization
- Configurable processing parameters (heading, grid size)

**3. Processing Monitoring**
- Real-time processing queue with status indicators
- Progress bars and completion tracking
- Automatic polling for status updates
- Error handling and retry mechanisms
- Processing history and task management

**4. Field Map Visualization**
- Gallery view for processed images and orthophotos with backend integration
- Grid-based layout for easy browsing
- Image metadata display with task names
- Lightbox viewer for detailed inspection with full-screen preview
- PDF report viewing with page navigation
- Export functionality for processed results
- Real-time task listing from backend API
- Automatic image and report retrieval

**5. Agricultural Analysis Tools**
- Field map generation for agricultural planning
- Pesticide prescription mapping interface with spray map functionality
- Interactive spray level selection with color-coded visualization
- Grid-based spray map editing
- Crop health analysis tools
- Integration with agricultural data systems

### Usage Walkthrough

1. **Start the Application**
   - Launch the backend server (`python run.py`)
   - Start the frontend development server (`npm start`)
   - Ensure Node ODM is running (`docker run -p 3000:3000 opendronemap/nodeodm`)

2. **Upload Images**
   - Navigate to the Upload tab
   - Drag and drop your drone images or click to browse
   - Review the upload queue and file details
   - Click "Upload Files" to start processing

3. **Monitor Processing**
   - Switch to the Processing tab to view active jobs
   - Watch real-time progress updates
   - Monitor queue status and completion times
   - Handle any processing errors

4. **View Results**
   - Access the Gallery tab to see processed images
   - Browse orthophotos and field maps from the backend
   - Click on images to view full-screen previews
   - View PDF reports directly in the browser
   - Download processed orthophotos and reports
   - Use the Field Maps tab for agricultural analysis
   - Generate pesticide prescriptions with spray maps as needed


## Known Problems

### Current Issues

**1. Node ODM Integration**
- **Issue**: Backend requires Node ODM to be running on localhost:3000
- **Impact**: Uploads will fail with 503 error if Node ODM is not available
- **Location**: `code/backend/app/api/v1/upload.py`
- **Workaround**: Ensure Node ODM Docker container is running before starting the backend
- **Status**: ✅ Improved error handling in Sprint 2

**2. File Cleanup**
- **Issue**: Temporary uploaded files are not cleaned up on processing errors
- **Impact**: Disk space may accumulate over time with failed uploads
- **Location**: `code/backend/app/api/v1/upload.py`
- **Workaround**: Manually clean the `uploads/` directory periodically
- **Status**: 🔄 Background polling implemented in Sprint 2, cleanup still pending

**3. Task Status Polling**
- **Issue**: Frontend polling may not handle all Node ODM status responses correctly
- **Impact**: Some tasks may show incorrect status or get stuck in processing state
- **Location**: `code/frontend/src/components/ProcessingView.tsx`
- **Workaround**: Use manual refresh button to force status updates
- **Status**: ✅ Background polling implemented in Sprint 2 for automatic status updates

**4. Field Maps Backend Integration**
- **Issue**: Field maps view still uses mock data instead of backend API
- **Impact**: Users cannot view actual processed field maps in Field Maps tab
- **Location**: `code/frontend/src/components/FieldMapsView.tsx`
- **Workaround**: Use Gallery view to see processed orthophotos
- **Status**: 🔄 Planned for future sprint

**5. Pesticide Prescription Backend Integration**
- **Issue**: Pesticide prescription generation uses mock data
- **Impact**: Cannot generate actual prescription maps from processed orthophotos
- **Location**: `code/frontend/src/components/PesticidePrescriptionsView.tsx`
- **Workaround**: Spray map functionality is available but needs backend integration
- **Status**: 🔄 Planned for future sprint

**6. Database Integration**
- **Issue**: No database persistence for tasks and results
- **Impact**: Task history and metadata are file-based only
- **Location**: Backend architecture
- **Workaround**: Current file-based storage works but lacks query capabilities
- **Status**: 🔄 Planned for future sprint

### Development Notes

- The application is currently in active development (Sprint 2 completed)
- **Sprint 2 Achievements**: 
  - ✅ Results API with orthophoto and PDF report retrieval
  - ✅ Gallery view backend integration with real data
  - ✅ PDF report viewing functionality
  - ✅ Task naming and metadata storage
  - ✅ Automatic background polling for task completion
  - ✅ File storage service with manifest management
  - ✅ Enhanced upload parameters (heading, grid size)
  - ✅ Spray map functionality in pesticide prescriptions
- Some features like database persistence and authentication are planned but not yet implemented
- Node ODM integration is functional with automatic polling and asset downloading
- File-based storage with manifest files is currently used for task metadata


## Contributing

We welcome contributions to the DroneBasedDevelopment project! Please follow these steps:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/DBD.git
   cd DBD
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Set up the development environment**:
   - Follow the installation steps above
   - Ensure all tests pass before making changes
5. **Make your changes**:
   - Follow the existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed
6. **Test your changes**:
   ```bash
   # Backend tests
   cd code/backend
   poetry run pytest
   
   # Frontend tests
   cd code/frontend
   npm test
   ```
7. **Commit your changes**:
   ```bash
   git commit -am 'Add your feature description'
   ```
8. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
9. **Submit a pull request** with a clear description of your changes

### Development Guidelines

- Use TypeScript for frontend development
- Follow PEP 8 for Python code
- Write meaningful commit messages
- Include tests for new features
- Update documentation for user-facing changes
- Ensure the application works with Node ODM integration

## Additional Documentation

### Project Documentation
- **[Backend API Documentation](code/backend/README.md)** - Detailed backend setup and API reference
- **[Frontend Documentation](code/frontend/README.md)** - Frontend development guide and component documentation
- **[Integration Guide](code/frontend/INTEGRATION_GUIDE.md)** - Backend-frontend integration details

### Project Structure
- **[Contributing Guidelines](CONTRIBUTING.md)** - Development standards and contribution process
- **[Project Requirements](docs/Reports/DBD_Assignment1_Requirements.pdf)** - Original project specifications
- **[Sprint 1 Report](docs/Reports/01_Requirements.md)** - Sprint 1 accomplishments and documentation
- **[Sprint 2 Report](docs/Reports/02_Requirements.md)** - Sprint 2 accomplishments and documentation
- **[Meeting Minutes](docs/Mom/)** - Project meeting documentation and templates

### Resources
- **[Tutorials](resources/Tutorials.md)** - Learning resources and guides
- **[Useful Links](resources/Links.md)** - External resources and references

### Development Resources
- **API Documentation**: Available at http://localhost:8001/docs when backend is running
- **Swagger UI**: Interactive API testing interface
- **ReDoc**: Alternative API documentation format

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License allows for:
- Commercial use
- Modification
- Distribution
- Private use

For more information about the MIT License, visit: https://choosealicense.com/licenses/mit/