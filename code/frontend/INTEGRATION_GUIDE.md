# Frontend-Backend Integration Guide

This guide explains how the frontend has been integrated with the backend API.

## 🔗 API Integration Status

### ✅ Completed Integrations

1. **Upload Endpoint Integration** (`UploadView.tsx`)
   - Real file upload to `/api/v1/upload/`
   - Backend availability checking
   - Error handling and user feedback
   - Progress tracking and status updates

2. **Status Polling Integration** (`ProcessingView.tsx`)
   - Real-time status polling from `/api/v1/upload/{task_id}/status`
   - Automatic task discovery from uploads
   - Progress visualization
   - Backend connection status

3. **API Service Layer** (`services/api.ts`)
   - Centralized API communication
   - Error handling
   - Health checks
   - Type-safe API calls

4. **TypeScript Types** (`types/upload.ts`)
   - Backend response interfaces
   - Processing task types
   - Upload response types

## 🚀 How It Works

### Upload Flow
1. User selects files in `UploadView`
2. Files are uploaded to backend via `apiService.uploadFiles()`
3. Backend returns task information including `nodeodm_task_id`
4. Upload success triggers a custom event
5. `ProcessingView` listens for the event and adds the task to its queue

### Status Polling Flow
1. `ProcessingView` polls every 5 seconds for active tasks
2. For each active task, calls `apiService.getTaskStatus(nodeodm_task_id)`
3. Updates task progress and status in real-time
4. Tasks persist in localStorage between sessions

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the frontend root:

```env
# Backend API Configuration
REACT_APP_API_BASE_URL=http://localhost:8001

# API Endpoints (optional overrides)
REACT_APP_UPLOAD_ENDPOINT=/api/v1/upload/
REACT_APP_STATUS_ENDPOINT=/api/v1/upload/{task_id}/status
REACT_APP_HEALTH_ENDPOINT=/health

# Development Settings
REACT_APP_DEBUG=true
REACT_APP_POLLING_INTERVAL=5000
```

### Backend Requirements
The backend must be running on `http://localhost:8001` with the following endpoints:

- `POST /api/v1/upload/` - File upload endpoint
- `GET /api/v1/upload/{task_id}/status` - Task status endpoint  
- `GET /health` - Health check endpoint

## 🎯 Key Features

### Real-time Updates
- Automatic status polling every 5 seconds
- Live progress bars for active tasks
- Backend connection status indicators

### Error Handling
- Network error detection
- Backend availability checking
- User-friendly error messages
- Graceful degradation when backend is unavailable

### Data Persistence
- Tasks stored in localStorage
- Survives browser refreshes
- Automatic cleanup of old tasks

### User Experience
- Loading states during operations
- Disabled buttons when backend unavailable
- Visual feedback for all operations
- Clear error messages

## 🔍 Monitoring

### Backend Status
Both components show backend connection status:
- Green dot: Backend connected
- Red dot: Backend disconnected

### Task Status
Tasks show detailed information:
- Task ID (truncated for display)
- File count
- Creation timestamp
- Current status and progress
- Error messages for failed tasks

## 🚨 Troubleshooting

### Backend Not Available
- Ensure backend is running on port 8001
- Check CORS configuration in backend
- Verify NodeODM is running on port 3000

### Upload Failures
- Check file size limits (100MB per file)
- Verify file formats (JPEG, PNG, TIFF)
- Check backend logs for detailed errors

### Status Polling Issues
- Verify task IDs are valid
- Check backend task status endpoint
- Monitor browser console for errors

## 📝 Development Notes

### Event System
The integration uses a custom event system to communicate between components:
- `newUpload` event: Dispatched when upload completes
- Contains full upload response from backend

### Polling Strategy
- Polls every 5 seconds for active tasks only
- Stops polling when no active tasks
- Handles network errors gracefully

### Type Safety
- All API responses are typed
- TypeScript interfaces match backend exactly
- Compile-time error checking for API calls

## 🔮 Future Enhancements

Potential improvements for the integration:

1. **WebSocket Support**: Real-time updates instead of polling
2. **Retry Logic**: Automatic retry for failed requests
3. **Batch Operations**: Upload multiple files in batches
4. **Progress Tracking**: More granular upload progress
5. **Task Management**: Cancel/restart failed tasks
6. **Notifications**: Browser notifications for task completion
