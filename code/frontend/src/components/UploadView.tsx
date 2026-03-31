import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiService, { ApiService } from '../services/api';
import {
  ChunkedFileInfo,
  ProcessingTask,
  UploadFile,
  UploadResponse,
  UploadSystemSettings,
  UploadSystemSettingsUpdate,
} from '../types/upload';
import UploadQueueBoard from './UploadQueueBoard';
import UploadSettingsModal from './UploadSettingsModal';
import PathGenerationOptions from './PathGenerationOptions';
import { useProcessingQueue } from '../hooks/useProcessingQueue';

interface BoundaryUploadFile {
  id: string;
  file: File;
  metadata?: {
    size: number;
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

function FitBoundsToPath({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, points]);

  return null;
}

function StartMarker({ position }: { position: [number, number] }) {
  const icon = L.divIcon({
    className: 'path-marker-start',
    html: '<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;">S</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

function EndMarker({ position }: { position: [number, number] }) {
  const icon = L.divIcon({
    className: 'path-marker-end',
    html: '<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;">E</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

type WizardStep = 'entry' | 'step1' | 'step2' | 'step3' | 'done';
type BoundaryUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

interface UploadViewProps {
  openSettingsTick?: number;
}

const UploadView: React.FC<UploadViewProps> = ({ openSettingsTick }) => {
  const [wizardStep, setWizardStep] = useState<WizardStep>('entry');
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

  const [fieldName, setFieldName] = useState('');
  const [boundaryFiles, setBoundaryFiles] = useState<BoundaryUploadFile[]>([]);
  const [boundaryUploadStatus, setBoundaryUploadStatus] = useState<BoundaryUploadStatus>('idle');
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingBoundary, setIsSyncingBoundary] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);

  const [pathHeading, setPathHeading] = useState(0);
  const [useDefaultRobotWidth, setUseDefaultRobotWidth] = useState(true);
  const [useDefaultCoverageWidth, setUseDefaultCoverageWidth] = useState(true);
  const [robotWidthOverride, setRobotWidthOverride] = useState(2.0);
  const [coverageWidthOverride, setCoverageWidthOverride] = useState(6.0);
  const [rtkBaseLongitude, setRtkBaseLongitude] = useState<number | ''>('');
  const [rtkBaseLatitude, setRtkBaseLatitude] = useState<number | ''>('');
  const [pathPreview, setPathPreview] = useState<PathPreview | null>(null);
  const [pathJobId, setPathJobId] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [isSavingPath, setIsSavingPath] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<UploadSystemSettings | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [recentCompletedResults, setRecentCompletedResults] = useState<Array<{ taskId: string; taskName?: string }>>([]);

  const { queuedTasks, runningTasks, processingTasks, addUploadToQueue, isPolling } = useProcessingQueue();

  useEffect(() => {
    if (openSettingsTick && openSettingsTick > 0) {
      setIsSettingsOpen(true);
    }
  }, [openSettingsTick]);

  useEffect(() => {
    const loadInitial = async () => {
      const available = await apiService.isBackendAvailable();
      setBackendAvailable(available);
      if (!available) return;
      try {
        const [resultList, loadedSettings, rtkBase] = await Promise.all([
          apiService.listResults(),
          apiService.getUploadSettings(),
          apiService.getRtkBase(),
        ]);
        setRecentCompletedResults(resultList.slice(0, 3).map((item) => ({ taskId: item.taskId, taskName: item.taskName })));
        setSettings(loadedSettings);
        setRobotWidthOverride(loadedSettings.robot_width);
        setCoverageWidthOverride(loadedSettings.coverage_width);
        setRtkBaseLongitude(rtkBase.longitude);
        setRtkBaseLatitude(rtkBase.latitude);
      } catch (error) {
        setSettingsError(error instanceof Error ? error.message : 'Failed to load settings');
      }
    };
    loadInitial();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const next: UploadFile[] = acceptedFiles.map((file) => ({
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
    setUploadFiles((prev) => [...prev, ...next]);
    setUploadError(null);
  }, []);

  const onBoundaryDrop = useCallback((acceptedFiles: File[]) => {
    const next = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      metadata: {
        size: file.size,
        name: file.name,
      },
    }));
    setBoundaryFiles((prev) => [...prev, ...next]);
    setBoundaryUploadStatus('idle');
    setBoundaryError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tif', '.tiff'],
      'application/octet-stream': ['.nav', '.obs', '.bin', '.mrk', '.MRK'],
    },
    maxSize: 2 * 1024 * 1024 * 1024,
    multiple: true,
  });

  const { getRootProps: getBoundaryRootProps, getInputProps: getBoundaryInputProps, isDragActive: isBoundaryDragActive } = useDropzone({
    onDrop: onBoundaryDrop,
    accept: {
      'application/octet-stream': ['.shp', '.shx', '.dbf', '.prj', '.cpg', '.qix', '.sbn', '.sbx'],
      'application/geo+json': ['.geojson'],
      'application/xml': ['.xml'],
    },
    maxSize: 200 * 1024 * 1024,
    multiple: true,
  });

  const pendingFiles = uploadFiles.filter((f) => f.status === 'pending' || f.status === 'error');
  const uploadingFiles = uploadFiles.filter((f) => f.status === 'uploading');
  const completedFiles = uploadFiles.filter((f) => f.status === 'completed');
  const sampleFiles = uploadFiles.slice(0, 5).map((f) => f.metadata?.name || 'Unknown');
  const totalUploadSize = uploadFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
  const boundarySampleFiles = boundaryFiles.slice(0, 5).map((f) => f.metadata?.name || 'Unknown');
  const boundaryTotalSize = boundaryFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);

  const activeTaskForUpload: ProcessingTask | undefined = useMemo(
    () => (uploadResponse ? processingTasks.find((task) => task.nodeodm_task_id === uploadResponse.nodeodm_task_id) : undefined),
    [processingTasks, uploadResponse]
  );

  const testBackendConnection = async () => {
    setConnectionTestResult('Testing connection...');
    const result = await apiService.testConnection();
    if (result.success) {
      setConnectionTestResult('Connection successful');
      setBackendAvailable(true);
      return;
    }
    setConnectionTestResult(`Connection failed: ${result.error}`);
    setBackendAvailable(false);
  };

  const handleBoundaryUpload = async () => {
    setBoundaryUploadStatus('uploading');
    setBoundaryError(null);
    if (!fieldName.trim()) {
      setBoundaryUploadStatus('error');
      setBoundaryError('Field name is required before uploading boundary files.');
      return;
    }
    if (boundaryFiles.length === 0) {
      setBoundaryUploadStatus('error');
      setBoundaryError('Please add boundary files before uploading.');
      return;
    }
    const hasShp = boundaryFiles.some((file) => file.file.name.toLowerCase().endsWith('.shp'));
    if (!hasShp) {
      setBoundaryUploadStatus('error');
      setBoundaryError('Boundary upload failed: include at least one .shp file, then retry.');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    setBoundaryUploadStatus('success');
    setWizardStep('step2');
  };

  const startUpload = async () => {
    setIsUploading(true);
    setUploadError(null);
    const targets = uploadFiles.filter((f) => f.status === 'pending' || f.status === 'error');
    if (targets.length === 0) {
      setIsUploading(false);
      return;
    }

    setUploadFiles((prev) =>
      prev.map((f) => (f.status === 'pending' || f.status === 'error' ? { ...f, status: 'uploading', progress: 0, error: undefined } : f))
    );

    try {
      const { task_id } = await apiService.uploadInit(fieldName.trim() || undefined, pathHeading, 1);
      const fileList: ChunkedFileInfo[] = [];
      const chunkSize = ApiService.CHUNK_SIZE;

      for (let fileIdx = 0; fileIdx < targets.length; fileIdx += 1) {
        const uploadFile = targets[fileIdx];
        const totalChunks = Math.ceil(uploadFile.file.size / chunkSize);
        fileList.push({
          filename: uploadFile.file.name,
          total_chunks: totalChunks,
          size: uploadFile.file.size,
        });
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, uploadFile.file.size);
          const blob = uploadFile.file.slice(start, end);
          await apiService.uploadChunk(task_id, uploadFile.file.name, chunkIndex, totalChunks, blob, (loaded, total) => {
            const chunkProgress = total ? loaded / total : 0;
            const progress = Math.round(((chunkIndex + chunkProgress) / totalChunks) * 100);
            setUploadFiles((prev) => prev.map((file) => (file.id === uploadFile.id ? { ...file, progress } : file)));
          });
        }
      }

      const response = await apiService.uploadFinalize(task_id, fileList, fieldName.trim() || undefined);
      setUploadFiles((prev) => prev.map((file) => (file.status === 'uploading' ? { ...file, status: 'completed', progress: 100 } : file)));
      setUploadResponse(response);
      setIsSyncingBoundary(true);
      try {
        await apiService.uploadBoundaryFiles(task_id, boundaryFiles.map((item) => item.file));
      } catch (syncError) {
        const syncMessage = syncError instanceof Error ? syncError.message : 'Boundary sync failed';
        setUploadError(`${syncMessage}. Please retry boundary sync before continuing.`);
        return;
      }
      addUploadToQueue(response);
      setWizardStep('step3');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(message);
      setUploadFiles((prev) =>
        prev.map((file) => (file.status === 'uploading' ? { ...file, status: 'error', error: message } : file))
      );
    } finally {
      setIsSyncingBoundary(false);
      setIsUploading(false);
    }
  };

  const pathLatLngs = pathPreview?.waypoints.map((point) => [point.lat, point.lon] as [number, number]) ?? [];
  const generatePathPreview = async () => {
    if (!uploadResponse?.task_id) {
      setPathError('Task not found. Upload imagery first.');
      return;
    }
    setIsGeneratingPath(true);
    setPathError(null);
    try {
      const robotWidth = useDefaultRobotWidth && settings ? settings.robot_width : robotWidthOverride;
      const coverageWidth = useDefaultCoverageWidth && settings ? settings.coverage_width : coverageWidthOverride;
      const response = await apiService.submitPathJobFromTask(
        uploadResponse.task_id,
        pathHeading,
        robotWidth,
        coverageWidth,
        fieldName,
        {
          longitude: typeof rtkBaseLongitude === 'number' ? rtkBaseLongitude : 0,
          latitude: typeof rtkBaseLatitude === 'number' ? rtkBaseLatitude : 0,
        }
      );
      setPathJobId(response.path_job_id);

      while (true) {
        const status = await apiService.getPathJobStatus(response.path_job_id);
        if (status.status === 'failed') {
          throw new Error(status.error || 'Path generation failed');
        }
        if (status.status === 'completed') break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const result = await apiService.getPathJobResult(response.path_job_id);
      const waypoints = result.waypoints || [];
      setPathPreview({
        waypoints,
        generatedAt: result.generated_at || new Date().toISOString(),
        heading: result.heading ?? pathHeading,
        robotWidth: result.robot_width ?? robotWidth,
        coverageWidth: result.coverage_width ?? coverageWidth,
      });
    } catch (error) {
      setPathError(error instanceof Error ? error.message : 'Path generation failed');
    } finally {
      setIsGeneratingPath(false);
    }
  };

  const retryBoundarySync = async () => {
    if (!uploadResponse?.task_id) return;
    setUploadError(null);
    setIsSyncingBoundary(true);
    try {
      await apiService.uploadBoundaryFiles(uploadResponse.task_id, boundaryFiles.map((item) => item.file));
      addUploadToQueue(uploadResponse);
      setWizardStep('step3');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Boundary sync failed';
      setUploadError(`${message}. Please retry boundary sync before continuing.`);
    } finally {
      setIsSyncingBoundary(false);
    }
  };

  const confirmPath = async () => {
    if (!uploadResponse || !pathJobId || !pathPreview) return;
    setIsSavingPath(true);
    setCompletionMessage(null);
    try {
      await apiService.savePathToTask(pathJobId, uploadResponse.task_id);
      let status = '';
      try {
        const taskStatus = await apiService.getTaskStatus(uploadResponse.nodeodm_task_id);
        status = taskStatus.status.toLowerCase();
      } catch {
        status = '';
      }
      if (status === 'completed' || status === 'success') {
        setCompletionMessage('Path confirmed. Imagery processing is complete and prescription generation can proceed now.');
      } else {
        setCompletionMessage('Path confirmed. Your prescription will be generated as soon as imagery processing completes.');
      }
      setWizardStep('done');
    } catch (error) {
      setCompletionMessage(error instanceof Error ? error.message : 'Failed to confirm path');
    } finally {
      setIsSavingPath(false);
    }
  };

  const saveSettings = async (
    payload: UploadSystemSettingsUpdate,
    nextRtkBase: { longitude: number; latitude: number }
  ) => {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const [updated] = await Promise.all([
        apiService.updateUploadSettings(payload),
        apiService.setRtkBase(nextRtkBase.longitude, nextRtkBase.latitude),
      ]);
      setSettings(updated);
      setRobotWidthOverride(updated.robot_width);
      setCoverageWidthOverride(updated.coverage_width);
      setRtkBaseLongitude(nextRtkBase.longitude);
      setRtkBaseLatitude(nextRtkBase.latitude);
      setIsSettingsOpen(false);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const resetSettings = async () => {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const updated = await apiService.resetUploadSettings();
      setSettings(updated);
      setRobotWidthOverride(updated.robot_width);
      setCoverageWidthOverride(updated.coverage_width);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Failed to reset settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <UploadSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        rtkBase={
          typeof rtkBaseLongitude === 'number' && typeof rtkBaseLatitude === 'number'
            ? { longitude: rtkBaseLongitude, latitude: rtkBaseLatitude }
            : { longitude: 0, latitude: 0 }
        }
        isSaving={isSavingSettings}
        error={settingsError}
        onClose={() => setIsSettingsOpen(false)}
        onSave={saveSettings}
        onReset={resetSettings}
      />

      <div className="rounded-lg border border-dark-700 bg-dark-800 p-8">
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-2xl font-semibold text-primary-400">Upload Imagery</h2>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-xs ${backendAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {backendAvailable ? 'Backend Connected' : 'Backend Disconnected'}
              </span>
            </div>
            <button onClick={testBackendConnection} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
              Test Connection
            </button>
          </div>
        </div>

        {connectionTestResult ? <p className="mt-3 text-xs text-dark-300">{connectionTestResult}</p> : null}

        {wizardStep === 'entry' ? (
          <div className="mt-6 rounded-lg border border-dark-600 bg-dark-700 p-6">
            <h3 className="text-lg font-medium text-primary-400">Create a new field</h3>
            <p className="mt-2 text-sm text-dark-300">
              Start the guided flow: field + boundary, imagery upload, then path generation and confirmation.
            </p>
            <button onClick={() => setWizardStep('step1')} className="mt-4 rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600">
              Create a New Field
            </button>
          </div>
        ) : null}

        {wizardStep === 'step1' ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-xl font-semibold text-primary-400">Step 1: Field name and boundary upload</h3>
              <label className="block text-sm text-dark-300">
                Field name
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                  value={fieldName}
                  onChange={(e) => {
                    setFieldName(e.target.value);
                    setBoundaryUploadStatus('idle');
                  }}
                />
              </label>
              <div
                {...getBoundaryRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center ${
                  isBoundaryDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 hover:border-primary-500 hover:bg-dark-700/50'
                }`}
              >
                <input {...getBoundaryInputProps()} />
                <p className="text-dark-200">{isBoundaryDragActive ? 'Drop boundary files here' : 'Drop boundary files here'}</p>
                <p className="mt-1 text-xs text-dark-400">Shapefile components (.shp required)</p>
              </div>
              {boundaryError ? <p className="text-sm text-red-400">{boundaryError}</p> : null}
              {boundaryUploadStatus === 'success' ? <p className="text-sm text-green-400">Boundary upload successful.</p> : null}
              <div className="flex gap-2">
                <button
                  onClick={handleBoundaryUpload}
                  disabled={boundaryUploadStatus === 'uploading'}
                  className="rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  {boundaryUploadStatus === 'uploading' ? 'Uploading...' : boundaryUploadStatus === 'error' ? 'Retry Upload' : 'Upload Boundary'}
                </button>
                <button
                  onClick={() => {
                    setBoundaryFiles([]);
                    setBoundaryUploadStatus('idle');
                    setBoundaryError(null);
                  }}
                  className="rounded bg-dark-600 px-4 py-2 text-dark-100 hover:bg-dark-500"
                >
                  Clear files
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-dark-600 bg-dark-700 p-4">
              <h4 className="font-medium text-primary-400">Boundary files</h4>
              <p className="mt-2 text-sm text-dark-300">{boundaryFiles.length} files</p>
              <p className="text-sm text-dark-300">{formatFileSize(boundaryTotalSize)}</p>
              <div className="mt-3 space-y-1">
                {boundarySampleFiles.length === 0 ? <p className="text-xs text-dark-400">No fields created yet</p> : null}
                {boundarySampleFiles.map((name, index) => (
                  <p key={index} className="truncate text-xs text-dark-400" title={name}>
                    {name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {wizardStep === 'step2' ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-xl font-semibold text-primary-400">Step 2: Upload drone imagery</h3>
              <p className="text-sm text-dark-300">Wait for upload completion before continuing.</p>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center ${
                  isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 hover:border-primary-500 hover:bg-dark-700/50'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-dark-200">{isDragActive ? 'Drop imagery here' : 'Drop drone imagery here'}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setWizardStep('step1')}
                  disabled={isUploading}
                  className="rounded bg-dark-600 px-4 py-2 text-dark-100 hover:bg-dark-500 disabled:opacity-50"
                >
                  Back to Step 1
                </button>
                <button
                  onClick={startUpload}
                  disabled={isUploading || isSyncingBoundary || pendingFiles.length === 0 || !backendAvailable}
                  className="rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  {isUploading
                    ? 'Uploading...'
                    : isSyncingBoundary
                      ? 'Saving boundary...'
                      : uploadError
                        ? 'Retry Upload'
                        : `Upload ${pendingFiles.length} Files`}
                </button>
                <button onClick={() => setUploadFiles([])} className="rounded bg-dark-600 px-4 py-2 text-dark-100 hover:bg-dark-500">
                  Clear files
                </button>
                {uploadResponse && pendingFiles.length === 0 ? (
                  <button
                    onClick={retryBoundarySync}
                    disabled={isSyncingBoundary}
                    className="rounded bg-dark-600 px-4 py-2 text-dark-100 hover:bg-dark-500 disabled:opacity-50"
                  >
                    {isSyncingBoundary ? 'Saving boundary...' : 'Retry Boundary Sync'}
                  </button>
                ) : null}
              </div>

              {uploadError ? <p className="text-sm text-red-400">{uploadError}</p> : null}
              {activeTaskForUpload ? (
                <p className="text-sm text-blue-300">
                  Upload complete. Processing status: {activeTaskForUpload.status} ({Math.round(activeTaskForUpload.progress)}%).
                </p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-dark-600 bg-dark-700 p-4">
                <h4 className="font-medium text-primary-400">Imagery summary</h4>
                <p className="mt-2 text-sm text-dark-300">{uploadFiles.length} files</p>
                <p className="text-sm text-dark-300">{formatFileSize(totalUploadSize)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pendingFiles.length > 0 ? <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-300">{pendingFiles.length} pending</span> : null}
                  {uploadingFiles.length > 0 ? <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-300">{uploadingFiles.length} uploading</span> : null}
                  {completedFiles.length > 0 ? <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-300">{completedFiles.length} completed</span> : null}
                </div>
                <div className="mt-3 space-y-1">
                  {sampleFiles.map((name, index) => (
                    <p key={index} className="truncate text-xs text-dark-400" title={name}>
                      {name}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-dark-600 bg-dark-700 p-4">
                <h4 className="font-medium text-primary-400">Applied processing settings</h4>
                {settings ? (
                  <div className="mt-2 space-y-1 text-xs text-dark-300">
                    <p>Feature quality: {settings.nodeodm.feature_quality}</p>
                    <p>Orthophoto resolution: {settings.nodeodm.orthophoto_resolution}</p>
                    <p>Point cloud quality: {settings.nodeodm.pc_quality}</p>
                    <p>Orthophoto PNG: required</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-dark-400">Loading settings...</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {wizardStep === 'step3' ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-xl font-semibold text-primary-400">Step 3: Generate and confirm path</h3>
              <PathGenerationOptions
                pathHeading={pathHeading}
                onPathHeadingChange={setPathHeading}
                useDefaultRobotWidth={useDefaultRobotWidth}
                onUseDefaultRobotWidthChange={setUseDefaultRobotWidth}
                robotWidthOverride={robotWidthOverride}
                onRobotWidthOverrideChange={setRobotWidthOverride}
                useDefaultCoverageWidth={useDefaultCoverageWidth}
                onUseDefaultCoverageWidthChange={setUseDefaultCoverageWidth}
                coverageWidthOverride={coverageWidthOverride}
                onCoverageWidthOverrideChange={setCoverageWidthOverride}
                settings={settings}
              />

              <div className="flex gap-2">
                <button
                  onClick={generatePathPreview}
                  disabled={isGeneratingPath}
                  className="rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  {isGeneratingPath ? 'Generating...' : 'Generate Path'}
                </button>
                <button
                  onClick={confirmPath}
                  disabled={!pathPreview || !pathJobId || isSavingPath}
                  className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isSavingPath ? 'Confirming...' : 'Confirm'}
                </button>
              </div>

              {pathError ? <p className="text-sm text-red-400">{pathError}</p> : null}

              <div className="h-[22rem] overflow-hidden rounded-lg border border-dark-600 bg-dark-900">
                {pathPreview ? (
                  <MapContainer center={[47.0364, -117.0471]} zoom={16} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polyline positions={pathLatLngs} pathOptions={{ color: '#22c55e', weight: 4 }} />
                    <FitBoundsToPath points={pathLatLngs} />
                    {pathLatLngs.length > 0 ? (
                      <>
                        <StartMarker position={pathLatLngs[0]} />
                        <EndMarker position={pathLatLngs[pathLatLngs.length - 1]} />
                      </>
                    ) : null}
                  </MapContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-dark-400">Generate a path to preview it here.</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-dark-600 bg-dark-700 p-4">
              <h4 className="font-medium text-primary-400">RTK base station</h4>
              <p className="mt-2 text-sm text-dark-300">
                Configure RTK base station in Settings (top-right gear icon).
              </p>
            </div>
          </div>
        ) : null}

        {wizardStep === 'done' ? (
          <div className="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <h3 className="text-lg font-semibold text-green-300">Workflow complete</h3>
            <p className="mt-2 text-sm text-green-200">{completionMessage}</p>
            <button
              className="mt-4 rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
              onClick={() => {
                setWizardStep('entry');
                setFieldName('');
                setBoundaryFiles([]);
                setBoundaryUploadStatus('idle');
                setBoundaryError(null);
                setUploadFiles([]);
                setUploadError(null);
                setUploadResponse(null);
                setPathPreview(null);
                setPathJobId(null);
                setPathError(null);
                setCompletionMessage(null);
              }}
            >
              Create another field
            </button>
          </div>
        ) : null}

        <div className="mt-6">
          <UploadQueueBoard
            queuedTasks={queuedTasks}
            runningTasks={runningTasks}
            recentCompletedResults={recentCompletedResults}
            isPolling={isPolling}
          />
        </div>
      </div>
    </div>
  );
};

export default UploadView;
