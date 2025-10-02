import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadFile } from '../types/upload';

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

  const simulateUpload = async (file: UploadFile) => {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        setUploadFiles((prev) => {
          const updated = prev.map(f => {
            if (f.id === file.id) {
              const newProgress = Math.min(f.progress + Math.random() * 20, 100);
              const newStatus: 'pending' | 'uploading' | 'completed' | 'error' = 
                newProgress === 100 ? 'completed' : 'uploading';
              
              return {
                ...f,
                progress: newProgress,
                status: newStatus,
              };
            }
            return f;
          });
          return updated;
        });
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        
        // Update stats when upload completes
        const fileSizeMB = (file.metadata?.size || 0) / (1024 * 1024);
        onStatsUpdate((prev) => ({
          imagesUploaded: prev.imagesUploaded + 1,
          processing: prev.processing - 1,
          completed: prev.completed + 1,
          storageUsed: prev.storageUsed + fileSizeMB,
        }));
        
        resolve();
      }, 2000 + Math.random() * 3000);
    });
  };

  const startUpload = async () => {
    setIsUploading(true);
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    
    // Update processing count when upload starts
    onStatsUpdate((prev) => ({
      processing: prev.processing + pendingFiles.length,
    }));
    
    for (const file of pendingFiles) {
      setUploadFiles((prev) => 
        prev.map(f => f.id === file.id ? { ...f, status: 'uploading' } : f)
      );
      
      await simulateUpload(file);
    }
    
    setIsUploading(false);
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
        <h2 className="text-2xl font-semibold text-primary-400 mb-4">
          Upload Drone Images
        </h2>
        <p className="text-dark-300 mb-6">
          Drag and drop your drone images here or click to browse. 
          Supported formats: JPEG, PNG, TIFF (Max 50MB per file)
        </p>
        
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
                  disabled={isUploading}
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
