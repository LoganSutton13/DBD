import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ProcessedOutput } from '../types/processedOutput';

interface FileUploadSectionProps {
  onFileUploaded: (file: ProcessedOutput) => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onFileUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    // Simulate file processing delay
    setTimeout(() => {
      // For TIF files, browsers can't display them directly, so we'll create a placeholder
      // In a real application, you'd convert TIF to PNG/JPEG on the server
      let previewUrl: string;
      
      if (file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff')) {
        // Create a TIF placeholder since browsers can't display TIF files
        previewUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM2NDc0OGIiLz4KPHRleHQgeD0iMjAwIiB5PSIxODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VElGIEZpbGU8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5NGEzYTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJyb3dzZXIgY2Fubm90IGRpc3BsYXk8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5NGEzYTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNsaWNrIHRvIGRvd25sb2FkPC90ZXh0Pgo8L3N2Zz4K';
      } else {
        // For JPEG/PNG files, use object URL
        previewUrl = URL.createObjectURL(file);
      }
      
      console.log('Created preview URL:', previewUrl);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Create a mock ProcessedOutput object
      const mockOutput: ProcessedOutput = {
        id: `uploaded-${Date.now()}`,
        taskId: `task-uploaded-${Date.now()}`,
        fileName: file.name,
        fileType: 'orthophoto', // Default to orthophoto for uploaded files
        originalFormat: file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff') ? 'TIF' : 'TIF',
        previewUrl: previewUrl,
        downloadUrl: URL.createObjectURL(file), // Keep original file for download
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        metadata: {
          resolution: 3.0, // Default resolution
          area: 'Custom upload',
          dimensions: {
            width: 2000, // Default dimensions
            height: 1500
          }
        }
      };

      console.log('Created mock output:', mockOutput);
      onFileUploaded(mockOutput);
      setIsUploading(false);
    }, 1000); // 1 second delay to simulate processing
  }, [onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/tiff': ['.tif', '.tiff'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
      <h3 className="text-lg font-medium text-primary-400 mb-4">
        Upload Test File
      </h3>
      <p className="text-dark-300 text-sm mb-4">
        Upload an orthophoto (TIF, JPEG, PNG) to test the gallery display
      </p>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
          isDragActive
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-dark-600 hover:border-primary-500 hover:bg-dark-700/50'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="text-primary-400">
              <svg className="mx-auto h-12 w-12 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-primary-400 text-lg">Processing file...</p>
            <p className="text-dark-400 text-sm">Creating preview and metadata</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-dark-400">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-dark-300 text-lg">
              {isDragActive ? 'Drop your file here' : 'Drop your orthophoto here'}
            </p>
            <p className="text-dark-400 text-sm">
              or click to browse files
            </p>
            <div className="text-xs text-dark-500">
              Supported: TIF, JPEG, PNG (Max 100MB)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadSection;
