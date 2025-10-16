import React from 'react';
import { ProcessedOutput } from '../types/processedOutput';

interface FileViewerModalProps {
  file: ProcessedOutput | null;
  isOpen: boolean;
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, isOpen, onClose }) => {
  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg max-w-6xl max-h-[90vh] w-full flex flex-col border border-dark-700">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-dark-700">
          <div>
            <h2 className="text-xl font-semibold text-primary-400">{file.fileName}</h2>
            <p className="text-dark-300 text-sm">
              {file.fileType.charAt(0).toUpperCase() + file.fileType.slice(1)} • {file.originalFormat} • {formatFileSize(file.fileSize)}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.open(file.downloadUrl, '_blank')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
            >
              Download Original
            </button>
            <button
              onClick={onClose}
              className="p-2 text-dark-400 hover:text-dark-200 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Viewer */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-dark-900 flex items-center justify-center p-4">
              {file.fileType === 'orthophoto' || file.fileType === 'map' ? (
                <div className="max-w-full max-h-full">
                  {file.originalFormat === 'TIF' ? (
                    <div className="text-center p-8">
                      <div className="text-dark-400 mb-4">
                        <svg className="mx-auto h-24 w-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-primary-400 mb-2">TIF File</h3>
                      <p className="text-dark-300 mb-4">
                        Browsers cannot display TIF files directly. This is a georeferenced orthophoto.
                      </p>
                      <p className="text-dark-400 text-sm mb-6">
                        Use the download button to get the original file for use in GIS software.
                      </p>
                      <div className="bg-dark-700 rounded-lg p-4 max-w-md mx-auto">
                        <h4 className="text-dark-200 font-medium mb-2">File Information:</h4>
                        <div className="text-sm text-dark-400 space-y-1">
                          <p>Format: {file.originalFormat}</p>
                          <p>Size: {formatFileSize(file.fileSize)}</p>
                          {file.metadata.resolution && <p>Resolution: {file.metadata.resolution} cm/pixel</p>}
                          {file.metadata.area && <p>Area: {file.metadata.area}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={file.previewUrl}
                      alt={file.fileName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        // Fallback for missing images
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDIyNVYxNzVIMTc1VjEyNVoiIGZpbGw9IiM2NDc0OGIiLz4KPHRleHQgeD0iMjAwIiB5PSIxNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UHJldmlldyBOb3QgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                      }}
                    />
                  )}
                </div>
              ) : file.fileType === 'contour' ? (
                <div className="max-w-full max-h-full">
                  <img
                    src={file.previewUrl}
                    alt={file.fileName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      // Fallback for missing SVG
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDIyNVYxNzVIMTc1VjEyNVoiIGZpbGw9IiM2NDc0OGIiLz4KPHRleHQgeD0iMjAwIiB5PSIxNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q29udG91ciBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Metadata Panel */}
          <div className="w-80 bg-dark-700 border-l border-dark-600 p-6 overflow-y-auto">
            <h3 className="text-lg font-medium text-primary-400 mb-4">File Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-dark-300">File Name</label>
                <p className="text-dark-100">{file.fileName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-dark-300">Type</label>
                <p className="text-dark-100 capitalize">{file.fileType}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-dark-300">Format</label>
                <p className="text-dark-100">{file.originalFormat}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-dark-300">Size</label>
                <p className="text-dark-100">{formatFileSize(file.fileSize)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-dark-300">Created</label>
                <p className="text-dark-100">{formatDate(file.createdAt)}</p>
              </div>

              {file.metadata.resolution && (
                <div>
                  <label className="text-sm font-medium text-dark-300">Resolution</label>
                  <p className="text-dark-100">{file.metadata.resolution} cm/pixel</p>
                </div>
              )}

              {file.metadata.area && (
                <div>
                  <label className="text-sm font-medium text-dark-300">Area Covered</label>
                  <p className="text-dark-100">{file.metadata.area}</p>
                </div>
              )}

              {file.metadata.dimensions && (
                <div>
                  <label className="text-sm font-medium text-dark-300">Dimensions</label>
                  <p className="text-dark-100">
                    {file.metadata.dimensions.width} × {file.metadata.dimensions.height} pixels
                  </p>
                </div>
              )}

              {file.metadata.georeferencing && (
                <div>
                  <label className="text-sm font-medium text-dark-300">Georeferencing</label>
                  <div className="text-dark-100 text-sm">
                    <p>Bounds:</p>
                    <p className="ml-2">
                      {file.metadata.georeferencing.bounds.minX.toFixed(6)}, {file.metadata.georeferencing.bounds.minY.toFixed(6)}
                    </p>
                    <p className="ml-2">
                      {file.metadata.georeferencing.bounds.maxX.toFixed(6)}, {file.metadata.georeferencing.bounds.maxY.toFixed(6)}
                    </p>
                    {file.metadata.georeferencing.projection && (
                      <p>Projection: {file.metadata.georeferencing.projection}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
