import React, { useState, useMemo } from 'react';
import { ProcessedOutput, FileTypeFilter, SortOption } from '../types/processedOutput';
import { mockProcessedOutputs } from '../data/mockData';
import FileCard from './FileCard';
import FileViewerModal from './FileViewerModal';

const GalleryView: React.FC = () => {
  // State management
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedFile, setSelectedFile] = useState<ProcessedOutput | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Mock data - replace with real API calls
  const processedOutputs = mockProcessedOutputs;

  // File type counts for stats
  const fileTypeCounts = useMemo(() => {
    return {
      all: processedOutputs.length,
      orthophoto: processedOutputs.filter(f => f.fileType === 'orthophoto').length,
      contour: processedOutputs.filter(f => f.fileType === 'contour').length,
      map: processedOutputs.filter(f => f.fileType === 'map').length,
    };
  }, [processedOutputs]);

  // Filter and sort outputs
  const filteredAndSortedOutputs = useMemo(() => {
    let filtered = processedOutputs;
    
    // Apply file type filter
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(file => file.fileType === fileTypeFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'size':
          return b.fileSize - a.fileSize;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [processedOutputs, fileTypeFilter, sortOption]);

  // Event handlers
  const handleFileClick = (file: ProcessedOutput) => {
    setSelectedFile(file);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedFile(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <h2 className="text-2xl font-semibold text-primary-400 mb-4">
          Image Gallery
        </h2>
        <p className="text-dark-300 mb-6">
          View your processed drone imagery outputs including orthophotos, contours, and maps
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-dark-300">Total Files</p>
                <p className="text-2xl font-semibold text-primary-400">{fileTypeCounts.all}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-dark-300">Orthophotos</p>
                <p className="text-2xl font-semibold text-blue-400">{fileTypeCounts.orthophoto}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-dark-300">Contours</p>
                <p className="text-2xl font-semibold text-green-400">{fileTypeCounts.contour}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-dark-300">Maps</p>
                <p className="text-2xl font-semibold text-purple-400">{fileTypeCounts.map}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gallery grid */}
        {filteredAndSortedOutputs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-dark-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-dark-300 text-lg mb-2">
              No processed files yet
            </p>
            <p className="text-dark-400 text-sm">
              Upload and process some drone images to see outputs here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedOutputs.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onClick={() => handleFileClick(file)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Gallery controls */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h3 className="text-lg font-medium text-primary-400">
            Gallery Controls
          </h3>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            {/* File Type Filter */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFileTypeFilter('all')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                  fileTypeFilter === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                }`}
              >
                All ({fileTypeCounts.all})
              </button>
              <button
                onClick={() => setFileTypeFilter('orthophoto')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                  fileTypeFilter === 'orthophoto'
                    ? 'bg-blue-500 text-white'
                    : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                }`}
              >
                Orthophotos ({fileTypeCounts.orthophoto})
              </button>
              <button
                onClick={() => setFileTypeFilter('contour')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                  fileTypeFilter === 'contour'
                    ? 'bg-green-500 text-white'
                    : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                }`}
              >
                Contours ({fileTypeCounts.contour})
              </button>
              <button
                onClick={() => setFileTypeFilter('map')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                  fileTypeFilter === 'map'
                    ? 'bg-purple-500 text-white'
                    : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                }`}
              >
                Maps ({fileTypeCounts.map})
              </button>
            </div>
            
            {/* Sort Options */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-dark-700 border border-dark-600 rounded px-3 py-1 text-dark-200 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="size">Largest First</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* File Viewer Modal */}
      <FileViewerModal
        file={selectedFile}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </div>
  );
};

export default GalleryView;
