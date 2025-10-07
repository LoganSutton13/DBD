# Backend Integration Guide

This document outlines all the areas where simulation code needs to be replaced with real backend integration.

## 🚀 Quick Start

1. **Remove all simulation code** marked with `TODO: REPLACE SIMULATION`
2. **Implement API endpoints** in your Python backend
3. **Replace mock data** with real API calls
4. **Update environment variables** for API endpoints

## 📁 Files That Need Backend Integration

### 1. **UploadView.tsx** - File Upload System
**Location**: `src/components/UploadView.tsx`

#### Current Simulation:
- `simulateUpload()` function creates fake progress
- Mock file processing with random delays

#### Backend Integration Needed:
```typescript
// Replace simulateUpload() with:
const uploadToBackend = async (file: UploadFile) => {
  const formData = new FormData();
  formData.append('file', file.file);
  formData.append('metadata', JSON.stringify(file.metadata));

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json();
};
```

#### Required Backend Endpoints:
- `POST /api/upload` - Upload drone images
- `GET /api/upload/progress/{jobId}` - Get upload progress
- `POST /api/upload/process` - Trigger image processing

---

### 2. **FieldMapsView.tsx** - Generated Field Maps
**Location**: `src/components/FieldMapsView.tsx`

#### Current Mock Data:
- Hardcoded field map examples
- Static processing states

#### Backend Integration Needed:
```typescript
useEffect(() => {
  const fetchFieldMaps = async () => {
    const response = await fetch('/api/fieldmaps');
    const data = await response.json();
    setFieldMaps(data);
  };
  fetchFieldMaps();
}, []);
```

#### Required Backend Endpoints:
- `GET /api/fieldmaps` - Get all field maps
- `GET /api/fieldmaps/{id}` - Get specific field map
- `GET /api/fieldmaps/{id}/download` - Download field map
- `DELETE /api/fieldmaps/{id}` - Delete field map

---

### 3. **ProcessingView.tsx** - Processing Queue
**Location**: `src/components/ProcessingView.tsx`

#### Current Placeholder:
- Static "No active processing jobs" message
- Mock processing settings

#### Backend Integration Needed:
```typescript
useEffect(() => {
  const fetchProcessingQueue = async () => {
    const response = await fetch('/api/processing/queue');
    const data = await response.json();
    setProcessingJobs(data);
  };
  
  // Poll for updates every 5 seconds
  fetchProcessingQueue();
  const interval = setInterval(fetchProcessingQueue, 5000);
  return () => clearInterval(interval);
}, []);
```

#### Required Backend Endpoints:
- `GET /api/processing/queue` - Get processing queue
- `GET /api/processing/jobs/{id}` - Get job status
- `POST /api/processing/settings` - Update processing settings
- `DELETE /api/processing/jobs/{id}` - Cancel job

---

### 4. **GalleryView.tsx** - Image Gallery
**Location**: `src/components/GalleryView.tsx`

#### Current Empty State:
- "No images yet" placeholder
- Static filter/sort buttons

#### Backend Integration Needed:
```typescript
useEffect(() => {
  const fetchGalleryImages = async () => {
    const response = await fetch('/api/gallery/images');
    const data = await response.json();
    setGalleryImages(data);
  };
  fetchGalleryImages();
}, []);
```

#### Required Backend Endpoints:
- `GET /api/gallery/images` - Get uploaded images
- `GET /api/gallery/images/{id}` - Get specific image
- `DELETE /api/gallery/images/{id}` - Delete image

---

### 5. **PesticidePrescriptionsView.tsx** - AI-Generated Pesticide Maps
**Location**: `src/components/PesticidePrescriptionsView.tsx`

#### Current Mock Data:
- Hardcoded pesticide prescription examples
- Static generation states
- Mock robot instructions

#### Backend Integration Needed:
```typescript
useEffect(() => {
  const fetchPrescriptions = async () => {
    const response = await fetch('/api/pesticide-prescriptions');
    const data = await response.json();
    setPrescriptions(data);
  };
  fetchPrescriptions();
}, []);

const generatePrescription = async (fieldMapId: string, pestType: string, pesticideType: string) => {
  const response = await fetch('/api/pesticide-prescriptions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldMapId, pestType, pesticideType }),
  });
  return response.json();
};
```

#### Required Backend Endpoints:
- `GET /api/pesticide-prescriptions` - Get all prescriptions
- `GET /api/pesticide-prescriptions/{id}` - Get specific prescription
- `POST /api/pesticide-prescriptions/generate` - Generate new prescription
- `GET /api/pesticide-prescriptions/{id}/robot-path` - Download robot path (GPX)
- `POST /api/pesticide-prescriptions/{id}/send-to-robot` - Send to agricultural robot

---

## 🔧 Backend API Requirements

### **Data Structures**

#### FieldMap Interface:
```typescript
interface FieldMap {
  id: string;
  name: string;
  createdAt: string;
  imageUrl: string;
  thumbnailUrl: string;
  size: { width: number; height: number };
  metadata: {
    fieldName: string;
    area: string;
    cropType?: string;
    droneModel?: string;
    flightDate: string;
    resolution: string;
  };
  status: 'processing' | 'completed' | 'failed';
}
```

#### UploadFile Interface:
```typescript
interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  metadata?: {
    size: number;
    type: string;
    lastModified: number;
    name: string;
  };
}
```

#### PesticidePrescription Interface:
```typescript
interface PesticidePrescription {
  id: string;
  name: string;
  createdAt: string;
  fieldMapId: string;
  prescriptionUrl: string;
  thumbnailUrl: string;
  status: 'generating' | 'ready' | 'failed';
  metadata: {
    fieldName: string;
    cropType: string;
    pestType: string;
    pesticideType: string;
    applicationRate: string;
    totalArea: string;
    estimatedCost: string;
    robotCompatible: boolean;
  };
  robotInstructions: {
    pathFile: string;
    waypoints: number;
    estimatedDuration: string;
    batteryRequired: string;
  };
}
```

### **Environment Configuration**

Create `.env` file in frontend root:
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_UPLOAD_ENDPOINT=/api/upload
REACT_APP_FIELDMAPS_ENDPOINT=/api/fieldmaps
REACT_APP_PROCESSING_ENDPOINT=/api/processing
REACT_APP_GALLERY_ENDPOINT=/api/gallery
```

### **Error Handling**

Implement consistent error handling:
```typescript
const handleApiError = (error: any) => {
  console.error('API Error:', error);
  // Show user-friendly error message
  // Update component state to show error
};
```

### **Loading States**

Add loading indicators for all async operations:
```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await apiCall();
    setData(data);
  } catch (error) {
    handleApiError(error);
  } finally {
    setLoading(false);
  }
};
```

## 🚨 Critical Integration Points

### **1. File Upload Progress**
- Replace simulation progress bars with real upload progress
- Handle network interruptions gracefully
- Implement retry logic for failed uploads

### **2. Real-time Updates**
- Implement WebSocket connections for processing updates
- Use polling for processing queue updates
- Show live progress for image stitching

### **3. Image Display**
- Replace placeholder images with real field maps
- Implement image viewer with zoom/pan
- Add image metadata display

### **4. Authentication**
- Add user authentication if needed
- Implement session management
- Secure API endpoints

## 📋 Integration Checklist

- [ ] Remove all `TODO: REPLACE SIMULATION` comments
- [ ] Implement backend API endpoints
- [ ] Replace mock data with API calls
- [ ] Add error handling and loading states
- [ ] Test file upload with real backend
- [ ] Test field map display with real images
- [ ] Test processing queue with real jobs
- [ ] Add environment configuration
- [ ] Implement authentication (if needed)
- [ ] Add proper error messages for users

## 🔗 API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload` | POST | Upload drone images |
| `/api/upload/progress/{id}` | GET | Get upload progress |
| `/api/fieldmaps` | GET | Get all field maps |
| `/api/fieldmaps/{id}` | GET | Get specific field map |
| `/api/fieldmaps/{id}/download` | GET | Download field map |
| `/api/processing/queue` | GET | Get processing queue |
| `/api/processing/jobs/{id}` | GET | Get job status |
| `/api/gallery/images` | GET | Get uploaded images |
| `/api/pesticide-prescriptions` | GET | Get all prescriptions |
| `/api/pesticide-prescriptions/generate` | POST | Generate new prescription |
| `/api/pesticide-prescriptions/{id}/robot-path` | GET | Download robot path |

## 💡 Tips for Integration

1. **Start with one component** - Begin with UploadView
2. **Use mock backend** - Create simple Python endpoints first
3. **Test incrementally** - Verify each endpoint before moving on
4. **Handle errors gracefully** - Always show user-friendly messages
5. **Add loading states** - Users need feedback during operations
6. **Implement retry logic** - Network issues are common
7. **Use TypeScript** - Maintain type safety throughout integration
