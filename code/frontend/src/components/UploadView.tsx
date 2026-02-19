import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDropzone } from 'react-dropzone';
import { UploadFile, UploadResponse, ChunkedFileInfo } from '../types/upload';
import apiService, { ApiService } from '../services/api';

interface AppStats {
  imagesUploaded: number;
  processing: number;
  completed: number;
}

interface UploadViewProps {
  onStatsUpdate: (updateFn: (prev: AppStats) => Partial<AppStats>) => void;
  currentStats: AppStats;
}

interface BoundaryUploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  metadata?: {
    size: number;
    type: string;
    lastModified: number;
    name: string;
  };
}

interface PathPoint {
  lat: number;
  lon: number;
}

interface PathPreview {
  waypoints: PathPoint[];
  generatedAt: string;
  heading: number;
  robotWidth: number;
  coverageWidth: number;
}

interface SimplePathResponse {
  waypoints: PathPoint[]; // lon/lat coordinates
  generated_at?: string;
  heading?: number;
  robot_width?: number;
  coverage_width?: number;
}

const normalizePathResponse = (
  response: SimplePathResponse,
  fallbackHeading: number,
  fallbackRobotWidth: number,
  fallbackCoverageWidth: number
): PathPreview => ({
  waypoints: response.waypoints,
  generatedAt: response.generated_at ?? new Date().toISOString(),
  heading: response.heading ?? fallbackHeading,
  robotWidth: response.robot_width ?? fallbackRobotWidth,
  coverageWidth: response.coverage_width ?? fallbackCoverageWidth,
});

function FitBoundsToPath({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [points, map]);

  return null;
}

function StartMarker({ position }: { position: [number, number] }) {
  const icon = L.divIcon({
    className: 'path-marker-start',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;
    ">S</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

function EndMarker({ position }: { position: [number, number] }) {
  const icon = L.divIcon({
    className: 'path-marker-end',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;
    ">E</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

const UploadView: React.FC<UploadViewProps> = ({ onStatsUpdate, currentStats }) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);
  const [taskName, setTaskName] = useState<string>('');
  const [heading, setHeading] = useState<number | ''>(0);
  const [gridSize, setGridSize] = useState<number | ''>(1);
  const [boundaryFiles, setBoundaryFiles] = useState<BoundaryUploadFile[]>([]);
  const [boundaryHeading, setBoundaryHeading] = useState<number | ''>(0);
  const [boundaryRobotWidth, setBoundaryRobotWidth] = useState<number | ''>(2.0);
  const [boundaryCoverageWidth, setBoundaryCoverageWidth] = useState<number | ''>(6.0);
  const [boundaryName, setBoundaryName] = useState<string>('');
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [pathPreview, setPathPreview] = useState<PathPreview | null>(null);
  const [pathJobId, setPathJobId] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [selectedStitchedField, setSelectedStitchedField] = useState<string>('');
  const [linkResult, setLinkResult] = useState<string | null>(null);
  const [isSavingPath, setIsSavingPath] = useState(false);

  // Check backend connection on component mount
  useEffect(() => {
    const checkInitialConnection = async () => {
      const isAvailable = await apiService.isBackendAvailable();
      setBackendAvailable(isAvailable);
    };

    checkInitialConnection();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
      metadata: {
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        name: file.name,
      },
    }));

    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const onBoundaryDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BoundaryUploadFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      metadata: {
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        name: file.name,
      },
    }));

    setBoundaryFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB per file (chunked upload handles large files)
    multiple: true,
  });

  const {
    getRootProps: getBoundaryRootProps,
    getInputProps: getBoundaryInputProps,
    isDragActive: isBoundaryDragActive,
  } = useDropzone({
    onDrop: onBoundaryDrop,
    accept: {
      'application/octet-stream': ['.shp', '.shx', '.dbf', '.prj', '.cpg', '.qix', '.sbn', '.sbx'],
      'application/geo+json': ['.geojson'],
      'application/xml': ['.xml'],
    },
    maxSize: 200 * 1024 * 1024, // 200MB
    multiple: true,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (id: string) => {
    setUploadFiles((prev) => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const removeBoundaryFile = (id: string) => {
    setBoundaryFiles((prev) => prev.filter(f => f.id !== id));
  };

  // Real backend upload function
  const uploadToBackend = async (files: File[]): Promise<UploadResponse> => {
    try {
      setUploadError(null);
      const numericHeading = typeof heading === 'number' ? heading : 0;
      const numericGridSize = typeof gridSize === 'number' ? gridSize : 1;
      const response = await apiService.uploadFiles(
        files,
        taskName?.trim() || undefined,
        numericHeading,
        numericGridSize
      );
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      throw error;
    }
  };


  const markSuccess = (uploadResponse: UploadResponse, count: number) => {
    setUploadFiles((prev) =>
      prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'completed', progress: 100 } : f
      )
    );
    onStatsUpdate((prev) => ({
      imagesUploaded: prev.imagesUploaded + count,
      processing: prev.processing + count,
      completed: prev.completed + count,
    }));
    setBackendAvailable(true);
    const existingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
    existingUploads.push(uploadResponse);
    localStorage.setItem('pendingUploads', JSON.stringify(existingUploads));
    window.dispatchEvent(new CustomEvent('newUpload', { detail: uploadResponse }));
  };

  const startUpload = async () => {
    setIsUploading(true);
    setUploadError(null);

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');

    if (pendingFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    const totalSize = pendingFiles.reduce((sum, f) => sum + (f.metadata?.size ?? f.file.size), 0);
    const useChunked = totalSize > ApiService.CHUNKED_UPLOAD_THRESHOLD;

    setUploadFiles((prev) =>
      prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
      )
    );

    try {
      let uploadResponse: UploadResponse;

      if (useChunked) {
        const numericHeading = typeof heading === 'number' ? heading : 0;
        const numericGridSize = typeof gridSize === 'number' ? gridSize : 1;
        const { task_id } = await apiService.uploadInit(
          taskName?.trim() || undefined,
          numericHeading,
          numericGridSize
        );

        const chunkSize = ApiService.CHUNK_SIZE;
        const fileList: ChunkedFileInfo[] = [];

        for (let fileIdx = 0; fileIdx < pendingFiles.length; fileIdx++) {
          const uf = pendingFiles[fileIdx];
          const file = uf.file;
          const totalChunks = Math.ceil(file.size / chunkSize);
          fileList.push({
            filename: file.name,
            total_chunks: totalChunks,
            size: file.size,
          });

          for (let ci = 0; ci < totalChunks; ci++) {
            const start = ci * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const blob = file.slice(start, end);
            await apiService.uploadChunk(
              task_id,
              file.name,
              ci,
              totalChunks,
              blob,
              (loaded, total) => {
                const chunkProgress = total ? loaded / total : 0;
                const progress = Math.round(
                  ((ci + chunkProgress) / totalChunks) * 100
                );
                setUploadFiles((prev) =>
                  prev.map((f) =>
                    f.id === uf.id ? { ...f, progress } : f
                  )
                );
              }
            );
            const progress = Math.round(((ci + 1) / totalChunks) * 100);
            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === uf.id ? { ...f, progress } : f
              )
            );
          }
        }

        uploadResponse = await apiService.uploadFinalize(
          task_id,
          fileList,
          taskName?.trim() || undefined
        );
      } else {
        const files = pendingFiles.map((f) => f.file);
        uploadResponse = await uploadToBackend(files);
      }

      markSuccess(uploadResponse, pendingFiles.length);
      console.log('Upload successful:', uploadResponse);
    } catch (error) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
      setBackendAvailable(false);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      console.error('Upload failed:', error);
    }

    setIsUploading(false);
  };

  // Test backend connection manually
  const testBackendConnection = async () => {
    setConnectionTestResult('Testing connection...');
    const result = await apiService.testConnection();

    if (result.success) {
      setConnectionTestResult('✅ Connection successful!');
      setBackendAvailable(true);
    } else {
      setConnectionTestResult(`❌ Connection failed: ${result.error}`);
      setBackendAvailable(false);
    }
  };

  const clearCompleted = () => {
    setUploadFiles((prev) => {
      prev.forEach(f => {
        if (f.status === 'completed') {
          URL.revokeObjectURL(f.preview);
        }
      });
      return prev.filter(f => f.status !== 'completed');
    });
  };

  const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
  const uploadingFiles = uploadFiles.filter(f => f.status === 'uploading');
  const completedFiles = uploadFiles.filter(f => f.status === 'completed');
  const boundaryPendingFiles = boundaryFiles.filter(f => f.status === 'pending');
  const boundaryTotalSize = boundaryFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
  const boundarySampleFiles = boundaryFiles.slice(0, 5).map(f => f.metadata?.name || 'Unknown');
  const pathLatLngs = pathPreview?.waypoints.map((point) => [point.lat, point.lon] as [number, number]) ?? [];

  const stitchedFields = [
    { id: 'stitched-001', name: 'Field A - 2025-10-30' },
    { id: 'stitched-002', name: 'Field B - 2025-11-05' },
    { id: 'stitched-003', name: 'West Lot - 2025-11-10' },
  ];

  const POLL_INTERVAL_MS = 2000;
  const generatePathPreview = async () => {
    if (boundaryPendingFiles.length === 0) {
      setPathError('Please add your field boundary shapefile files first.');
      return;
    }

    setIsGeneratingPath(true);
    setPathError(null);
    setLinkResult(null);

    try {
      const files = boundaryPendingFiles.map((f) => f.file);
      const numericBoundaryHeading = typeof boundaryHeading === 'number' ? boundaryHeading : 0;
      const numericRobotWidth = typeof boundaryRobotWidth === 'number' ? boundaryRobotWidth : 0;
      const numericCoverageWidth = typeof boundaryCoverageWidth === 'number' ? boundaryCoverageWidth : 0;
      const { path_job_id } = await apiService.submitPathJob(
        files,
        numericBoundaryHeading,
        numericRobotWidth,
        numericCoverageWidth,
        boundaryName?.trim() || undefined
      );
      setPathJobId(path_job_id);

      for (;;) {
        const statusRes = await apiService.getPathJobStatus(path_job_id);
        if (statusRes.status === 'completed') {
          const result = await apiService.getPathJobResult(path_job_id);
          if (result.waypoints && result.generated_at !== undefined) {
            setPathPreview(
              normalizePathResponse(
                {
                  waypoints: result.waypoints,
                  generated_at: result.generated_at,
                  heading: result.heading,
                },
                numericBoundaryHeading,
                numericRobotWidth,
                numericCoverageWidth
              )
            );
          }
          break;
        }
        if (statusRes.status === 'failed') {
          setPathError(statusRes.error ?? 'Path generation failed');
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Path generation failed';
      setPathError(errorMessage);
    } finally {
      setIsGeneratingPath(false);
    }
  };

  const linkPathToField = async () => {
    if (!pathPreview || !selectedStitchedField || !pathJobId) return;
    const field = stitchedFields.find((item) => item.id === selectedStitchedField);
    setIsSavingPath(true);
    setLinkResult(null);
    try {
      await apiService.savePathToTask(pathJobId, selectedStitchedField);
      setLinkResult(`Path saved to ${field?.name ?? 'selected field'}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save path';
      setLinkResult(`Error: ${msg}`);
    } finally {
      setIsSavingPath(false);
    }
  };

  // Get sample filenames (first 5 files)
  const sampleFiles = uploadFiles.slice(0, 5).map(f => f.metadata?.name || 'Unknown');
  const totalSize = uploadFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-primary-400">
            Upload Drone Images
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${backendAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {backendAvailable ? 'Backend Connected' : 'Backend Disconnected'}
              </span>
            </div>
            <button
              onClick={testBackendConnection}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Test Connection
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{uploadError}</p>
            </div>
          </div>
        )}

        {connectionTestResult && (
          <div className={`mb-6 p-4 border rounded-lg ${connectionTestResult.includes('✅')
            ? 'bg-green-500/10 border-green-500/20'
            : connectionTestResult.includes('❌')
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-blue-500/10 border-blue-500/20'
            }`}>
            <div className="flex items-center">
              <p className={`text-sm ${connectionTestResult.includes('✅')
                ? 'text-green-400'
                : connectionTestResult.includes('❌')
                  ? 'text-red-400'
                  : 'text-blue-400'
                }`}>
                {connectionTestResult}
              </p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Drag and drop area with inputs */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-dark-300 mb-4">
                Drag and drop your drone images here or click to browse.
                Supported formats: JPEG, PNG, TIFF. Large uploads (10GB+) use chunked upload.
              </p>

              {/* Upload area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${isDragActive
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 hover:border-primary-500 hover:bg-dark-700/50'
                  }`}
              >
                <input {...getInputProps()} />
                <div className="text-dark-400 mb-4">
                  <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-dark-300 text-lg">
                  {isDragActive ? 'Drop your images here' : 'Drop your drone images here'}
                </p>
                <p className="text-dark-400 text-sm mt-2">
                  or click to browse files
                </p>
              </div>

              {/* Input options at bottom of drag/drop area */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2" htmlFor="taskName">Task name (optional)</label>
                  <input
                    id="taskName"
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="e.g., Field A - 2025-10-30"
                    className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2" htmlFor="heading">Heading (degrees)</label>
                    <input
                      id="heading"
                      type="number"
                      value={heading}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setHeading('');
                        } else {
                          setHeading(parseFloat(val) || 0);
                        }
                      }}
                      placeholder="0"
                      min="0"
                      max="360"
                      step="0.1"
                      className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2" htmlFor="gridSize">Grid size (meters)</label>
                    <input
                      id="gridSize"
                      type="number"
                      value={gridSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setGridSize('');
                        } else {
                          setGridSize(parseFloat(val) || 1);
                        }
                      }}
                      placeholder="1"
                      min="0.1"
                      step="0.1"
                      className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Uploaded images summary */}
          <div className="lg:col-span-1">
            {uploadFiles.length > 0 ? (
              <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
                <h3 className="text-lg font-medium text-primary-400 mb-4">
                  Uploaded Images
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-dark-300 text-sm mb-2">Total Images</p>
                    <p className="text-2xl font-semibold text-primary-400">{uploadFiles.length}</p>
                  </div>

                  <div>
                    <p className="text-dark-300 text-sm mb-2">Total Size</p>
                    <p className="text-lg text-dark-100">{formatFileSize(totalSize)}</p>
                  </div>

                  <div>
                    <p className="text-dark-300 text-sm mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {pendingFiles.length > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          {pendingFiles.length} pending
                        </span>
                      )}
                      {uploadingFiles.length > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                          {uploadingFiles.length} uploading
                        </span>
                      )}
                      {completedFiles.length > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          {completedFiles.length} completed
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-dark-300 text-sm mb-2">Sample Files</p>
                    <div className="space-y-1">
                      {sampleFiles.map((name, index) => (
                        <p key={index} className="text-dark-400 text-xs truncate" title={name}>
                          {name}
                        </p>
                      ))}
                      {uploadFiles.length > 5 && (
                        <p className="text-dark-500 text-xs">
                          +{uploadFiles.length - 5} more files
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dark-600 space-y-2">
                    {pendingFiles.length > 0 && (
                      <button
                        onClick={startUpload}
                        disabled={isUploading || !backendAvailable}
                        className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} Files`}
                      </button>
                    )}
                    {completedFiles.length > 0 && (
                      <button
                        onClick={clearCompleted}
                        className="w-full px-4 py-2 bg-dark-600 text-dark-300 rounded-lg hover:bg-dark-500 transition-colors duration-200"
                      >
                        Clear Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
                <h3 className="text-lg font-medium text-primary-400 mb-2">
                  Uploaded Images
                </h3>
                <p className="text-dark-400 text-sm">
                  No images uploaded yet. Drag and drop images to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-primary-400">
              Upload Field Boundary (Shapefile)
            </h2>
            <p className="text-dark-300 text-sm mt-2">
              Provide the boundary shapefile folder and a heading for path generation.
            </p>
          </div>
          <div className="text-xs text-dark-400 text-right">
            <p>Supported files:</p>
            <p>.shp, .shx, .dbf, .prj, .cpg, .qix, .sbn, .sbx</p>
          </div>
        </div>

        {pathError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{pathError}</p>
            </div>
          </div>
        )}

        {linkResult && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center">
              <p className="text-green-400 text-sm">{linkResult}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-dark-300 mb-4">
                Drag and drop all shapefile components or click to browse. Keep the files together from the same folder.
              </p>

              <div
                {...getBoundaryRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${isBoundaryDragActive
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 hover:border-primary-500 hover:bg-dark-700/50'
                  }`}
              >
                <input {...getBoundaryInputProps()} />
                <div className="text-dark-400 mb-4">
                  <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-dark-300 text-lg">
                  {isBoundaryDragActive ? 'Drop shapefile contents here' : 'Drop shapefile contents here'}
                </p>
                <p className="text-dark-400 text-sm mt-2">
                  or click to browse files
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2" htmlFor="boundaryName">Boundary name (optional)</label>
                  <input
                    id="boundaryName"
                    type="text"
                    value={boundaryName}
                    onChange={(e) => setBoundaryName(e.target.value)}
                    placeholder="e.g., North Field Boundary"
                    className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2" htmlFor="boundaryHeading">Heading (degrees)</label>
                    <input
                      id="boundaryHeading"
                      type="number"
                      value={boundaryHeading}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBoundaryHeading('');
                        } else {
                          setBoundaryHeading(parseFloat(val) || 0);
                        }
                      }}
                      placeholder="0"
                      min="0"
                      max="360"
                      step="0.1"
                      className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2" htmlFor="boundaryRobotWidth">Robot width (meters)</label>
                    <input
                      id="boundaryRobotWidth"
                      type="number"
                      value={boundaryRobotWidth}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBoundaryRobotWidth('');
                        } else {
                          setBoundaryRobotWidth(parseFloat(val) || 0);
                        }
                      }}
                      placeholder="2.0"
                      min="0.1"
                      step="0.1"
                      className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2" htmlFor="boundaryCoverageWidth">Coverage width (meters)</label>
                    <input
                      id="boundaryCoverageWidth"
                      type="number"
                      value={boundaryCoverageWidth}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBoundaryCoverageWidth('');
                        } else {
                          setBoundaryCoverageWidth(parseFloat(val) || 0);
                        }
                      }}
                      placeholder="6.0"
                      min="0.1"
                      step="0.1"
                      className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-end">
                  <button
                    onClick={generatePathPreview}
                    disabled={isGeneratingPath || boundaryPendingFiles.length === 0}
                    className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isGeneratingPath ? 'Generating...' : 'Generate Path (Preview)'}
                  </button>
                </div>
                <p className="text-xs text-dark-400">
                  Path is generated asynchronously; the map updates when generation completes.
                </p>

                {/* Path Preview — below heading, slightly smaller */}
                <div className="mt-6">
                  <h3 className="text-base font-medium text-primary-400 mb-3">Path Preview</h3>
                  <div className="w-full h-[22rem] rounded-lg overflow-hidden border border-dark-600 bg-dark-900">
                    {pathPreview ? (
                      <MapContainer
                        center={[47.0364, -117.0471]}
                        zoom={16}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                      >
                        <TileLayer
                          attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Polyline positions={pathLatLngs} pathOptions={{ color: '#22c55e', weight: 4 }} />
                        <FitBoundsToPath points={pathLatLngs} />
                        {pathLatLngs.length > 0 && (
                          <>
                            <StartMarker position={pathLatLngs[0]} />
                            <EndMarker position={pathLatLngs[pathLatLngs.length - 1]} />
                          </>
                        )}
                      </MapContainer>
                    ) : (
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-12 h-12 text-primary-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <p className="text-dark-300 text-sm">No path yet. Generate path above.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {pathPreview && (
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-dark-400">
                      <span>Waypoints: {pathPreview.waypoints.length}</span>
                      <span>Heading: {pathPreview.heading.toFixed(1)}°</span>
                      <span>Robot width: {pathPreview.robotWidth.toFixed(2)} m</span>
                      <span>Coverage width: {pathPreview.coverageWidth.toFixed(2)} m</span>
                      <span>Start (S) → End (E)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
              <h3 className="text-lg font-medium text-primary-400 mb-4">
                Boundary Upload
              </h3>
              {boundaryFiles.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-dark-300 text-sm mb-2">Files Added</p>
                    <p className="text-2xl font-semibold text-primary-400">{boundaryFiles.length}</p>
                  </div>
                  <div>
                    <p className="text-dark-300 text-sm mb-2">Total Size</p>
                    <p className="text-lg text-dark-100">{formatFileSize(boundaryTotalSize)}</p>
                  </div>
                  <div>
                    <p className="text-dark-300 text-sm mb-2">Sample Files</p>
                    <div className="space-y-1">
                      {boundarySampleFiles.map((name, index) => (
                        <p key={index} className="text-dark-400 text-xs truncate" title={name}>
                          {name}
                        </p>
                      ))}
                      {boundaryFiles.length > 5 && (
                        <p className="text-dark-500 text-xs">
                          +{boundaryFiles.length - 5} more files
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-dark-600 space-y-2">
                    {boundaryPendingFiles.length > 0 && (
                      <button
                        onClick={() => setBoundaryFiles([])}
                        className="w-full px-4 py-2 bg-dark-600 text-dark-300 rounded-lg hover:bg-dark-500 transition-colors duration-200"
                      >
                        Clear Files
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-dark-400 text-sm">
                  No shapefile components uploaded yet.
                </p>
              )}
            </div>

            <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
              <h3 className="text-lg font-medium text-primary-400 mb-4">
                Link to Stitched Field
              </h3>
              <div className="space-y-3">
                <select
                  value={selectedStitchedField}
                  onChange={(e) => setSelectedStitchedField(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 text-dark-100 border border-dark-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a stitched field</option>
                  {stitchedFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={linkPathToField}
                  disabled={!pathPreview || !selectedStitchedField || !pathJobId || isSavingPath}
                  className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSavingPath ? 'Saving…' : 'Link and Save Path'}
                </button>
                <p className="text-xs text-dark-400">
                  Saves the current path to the selected stitched field. Stitched fields list will be populated from the backend.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;
