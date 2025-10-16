import React from 'react';
import { ProcessedOutput } from '../types/processedOutput';

interface FileCardProps {
  file: ProcessedOutput;
  onClick: () => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'orthophoto':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'contour':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        );
      case 'map':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case 'orthophoto':
        return 'text-blue-400 bg-blue-500/20';
      case 'contour':
        return 'text-green-400 bg-green-500/20';
      case 'map':
        return 'text-purple-400 bg-purple-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-dark-700 rounded-lg p-4 border border-dark-600 hover:border-primary-500/50 hover:bg-dark-600 transition-all duration-200 cursor-pointer group"
    >
      {/* Preview Image */}
      <div className="aspect-video bg-dark-800 rounded-lg mb-3 overflow-hidden">
        {(file.fileType === 'orthophoto' || file.fileType === 'map') ? (
          <img
            src={file.previewUrl}
            alt={file.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onLoad={() => {
              console.log('Image loaded successfully:', file.fileName);
            }}
            onError={(e) => {
              console.error('Image failed to load:', file.fileName, file.previewUrl);
              // Fallback for missing images - use a simple colored rectangle
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM2NDc0OGIiLz4KPHRleHQgeD0iMTUwIiB5PSIxMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgUHJldmlldzwvdGV4dD4KPC9zdmc+';
            }}
          />
        ) : file.fileType === 'contour' ? (
          <img
            src={file.previewUrl}
            alt={file.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onLoad={() => {
              console.log('Contour image loaded successfully:', file.fileName);
            }}
            onError={(e) => {
              console.error('Contour image failed to load:', file.fileName, file.previewUrl);
              // Fallback for missing SVG
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjNjQ3NDhiIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTQwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5NGEzYTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNvbnRvdXI8L3RleHQ+Cjwvc3ZnPgo=';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-dark-400">
              {getFileTypeIcon(file.fileType)}
            </div>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-dark-100 font-medium text-sm truncate">{file.fileName}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(file.fileType)}`}>
            {file.fileType}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-dark-400">
          <span>{file.originalFormat}</span>
          <span>{formatFileSize(file.fileSize)}</span>
        </div>

        {file.metadata.resolution && (
          <div className="text-xs text-dark-400">
            Resolution: {file.metadata.resolution} cm/pixel
          </div>
        )}

        {file.metadata.area && (
          <div className="text-xs text-dark-400">
            Area: {file.metadata.area}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileCard;
