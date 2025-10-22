import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadFile, UploadResponse } from '../types/upload';
import apiService from '../services/api';

interface AppStats {
  imagesUploaded: number;
  processing: number;
  completed: number;
  storageUsed: number;
}

interface UploadViewProps {
  onStatsUpdate: (updateFn: (prev: AppStats) => Partial<AppStats>) => void;
  currentStats: AppStats;
}

const UploadView: React.FC<UploadViewProps> = ({ onStatsUpdate, currentStats }) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
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

  // Real backend upload function
  const uploadToBackend = async (files: File[]): Promise<UploadResponse> => {
    try {
      setUploadError(null);
      const response = await apiService.uploadFiles(files);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      throw error;
    }
  };


  const startUpload = async () => {
    setIsUploading(true);
    setUploadError(null);
    
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    // Backend availability will be determined by the actual upload attempt

    // Update all pending files to uploading status
    setUploadFiles((prev) => 
      prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
      )
    );

    try {
      // Upload all files at once to the backend
      const files = pendingFiles.map(f => f.file);
      const uploadResponse = await uploadToBackend(files);

      // Update all uploading files to completed status
      setUploadFiles((prev) => 
        prev.map(f => 
          f.status === 'uploading' ? { ...f, status: 'completed', progress: 100 } : f
        )
      );

      // Update stats
      const totalSizeMB = pendingFiles.reduce((sum, f) => sum + (f.metadata?.size || 0) / (1024 * 1024), 0);
      onStatsUpdate((prev) => ({
        imagesUploaded: prev.imagesUploaded + pendingFiles.length,
        processing: prev.processing + pendingFiles.length,
        completed: prev.completed + pendingFiles.length,
        storageUsed: prev.storageUsed + totalSizeMB,
      }));

      console.log('Upload successful:', uploadResponse);
      setBackendAvailable(true); // Backend is available since upload succeeded
      
      // Dispatch event for ProcessingView to listen to
      console.log('Dispatching newUpload event with data:', uploadResponse);
      
      // Also store in localStorage as a backup
      const existingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
      existingUploads.push(uploadResponse);
      localStorage.setItem('pendingUploads', JSON.stringify(existingUploads));
      console.log('Stored upload in localStorage as backup');
      
      const event = new CustomEvent('newUpload', { detail: uploadResponse });
      window.dispatchEvent(event);
      console.log('newUpload event dispatched successfully');
      
    } catch (error) {
      // Update all uploading files to error status
      setUploadFiles((prev) => 
        prev.map(f => 
          f.status === 'uploading' ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : f
        )
      );
      
      // Set backend as unavailable if upload fails
      setBackendAvailable(false);
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

  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <div className="flex justify-between items-start mb-4">
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
        <p className="text-dark-300 mb-6">
          Drag and drop your drone images here or click to browse. 
          Supported formats: JPEG, PNG, TIFF (Max 50MB per file)
        </p>
        
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
          <div className={`mb-6 p-4 border rounded-lg ${
            connectionTestResult.includes('✅') 
              ? 'bg-green-500/10 border-green-500/20' 
              : connectionTestResult.includes('❌')
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-blue-500/10 border-blue-500/20'
          }`}>
            <div className="flex items-center">
              <p className={`text-sm ${
                connectionTestResult.includes('✅') 
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
        
        {/* Upload area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${
            isDragActive
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
      </div>
      
      {/* Upload queue */}
      {uploadFiles.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-primary-400">
              Upload Queue ({uploadFiles.length} files)
            </h3>
            <div className="flex space-x-2">
              {pendingFiles.length > 0 && (
                <button
                  onClick={startUpload}
                  disabled={isUploading || !backendAvailable}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} Files`}
                </button>
              )}
              {completedFiles.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition-colors duration-200"
                >
                  Clear Completed
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {uploadFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-4 p-4 bg-dark-700 rounded-lg">
                <div className="w-12 h-12 bg-dark-600 rounded-lg flex-shrink-0 overflow-hidden">
                  <img
                    src={file.preview}
                    alt={file.metadata?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-dark-100 text-sm font-medium truncate">
                    {file.metadata?.name}
                  </p>
                  <p className="text-dark-400 text-xs">
                    {formatFileSize(file.metadata?.size || 0)}
                  </p>
                  
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-dark-600 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-dark-400 text-xs mt-1">
                        {Math.round(file.progress)}%
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    file.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    file.status === 'uploading' ? 'bg-blue-500/20 text-blue-400' :
                    file.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {file.status}
                  </span>
                  
                  {file.status === 'pending' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-dark-400 hover:text-red-400 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadView;
