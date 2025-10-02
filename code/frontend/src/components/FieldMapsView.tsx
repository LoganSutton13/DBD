import React, { useState } from 'react';

interface FieldMap {
  id: string;
  name: string;
  createdAt: string;
  imageUrl: string;
  thumbnailUrl: string;
  size: {
    width: number;
    height: number;
  };
  metadata: {
    fieldName: string;
    area: string; // in acres/hectares
    cropType?: string;
    droneModel?: string;
    flightDate: string;
    resolution: string;
  };
  status: 'processing' | 'completed' | 'failed';
}

const FieldMapsView: React.FC = () => {
  const [selectedMap, setSelectedMap] = useState<FieldMap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // TODO: REPLACE MOCK DATA WITH REAL BACKEND API CALL
  // Mock data - this would come from your Python backend
  const [fieldMaps] = useState<FieldMap[]>([
    {
      id: '1',
      name: 'North Field - Wheat 2024',
      createdAt: '2024-01-15T10:30:00Z',
      imageUrl: '/api/fieldmaps/north-field-wheat.jpg',
      thumbnailUrl: '/api/fieldmaps/thumbnails/north-field-wheat.jpg',
      size: { width: 4096, height: 3072 },
      metadata: {
        fieldName: 'North Field',
        area: '45.2 acres',
        cropType: 'Wheat',
        droneModel: 'DJI Phantom 4 Pro',
        flightDate: '2024-01-15',
        resolution: '2cm/pixel',
      },
      status: 'completed',
    },
    {
      id: '2',
      name: 'South Field - Corn 2024',
      createdAt: '2024-01-10T14:15:00Z',
      imageUrl: '/api/fieldmaps/south-field-corn.jpg',
      thumbnailUrl: '/api/fieldmaps/thumbnails/south-field-corn.jpg',
      size: { width: 6144, height: 4096 },
      metadata: {
        fieldName: 'South Field',
        area: '67.8 acres',
        cropType: 'Corn',
        droneModel: 'DJI Mavic 3',
        flightDate: '2024-01-10',
        resolution: '1.5cm/pixel',
      },
      status: 'completed',
    },
    {
      id: '3',
      name: 'East Field - Processing...',
      createdAt: '2024-01-20T09:45:00Z',
      imageUrl: '',
      thumbnailUrl: '',
      size: { width: 0, height: 0 },
      metadata: {
        fieldName: 'East Field',
        area: '32.1 acres',
        cropType: 'Soybeans',
        droneModel: 'DJI Air 2S',
        flightDate: '2024-01-20',
        resolution: '3cm/pixel',
      },
      status: 'processing',
    },
  ]);

  // TODO: IMPLEMENT BACKEND INTEGRATION
  // Replace mock data with real API calls:
  /*
  useEffect(() => {
    const fetchFieldMaps = async () => {
      try {
        const response = await fetch('/api/fieldmaps');
        if (!response.ok) {
          throw new Error('Failed to fetch field maps');
        }
        const data = await response.json();
        setFieldMaps(data);
      } catch (error) {
        console.error('Error fetching field maps:', error);
        // Handle error state
      }
    };

    fetchFieldMaps();
  }, []);

  // TODO: IMPLEMENT REAL DOWNLOAD FUNCTION
  const downloadFieldMap = async (mapId: string) => {
    try {
      const response = await fetch(`/api/fieldmaps/${mapId}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `field-map-${mapId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  */

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-dark-500/20 text-dark-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary-400 mb-2">
              Field Maps
            </h2>
            <p className="text-dark-300">
              View generated field maps from your drone imagery
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Download All */}
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200">
              Download All
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary-400">{fieldMaps.length}</div>
            <div className="text-dark-300 text-sm">Total Maps</div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {fieldMaps.filter(m => m.status === 'completed').length}
            </div>
            <div className="text-dark-300 text-sm">Completed</div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {fieldMaps.filter(m => m.status === 'processing').length}
            </div>
            <div className="text-dark-300 text-sm">Processing</div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {fieldMaps.reduce((sum, m) => {
                const area = parseFloat(m.metadata.area.split(' ')[0]);
                return sum + area;
              }, 0).toFixed(1)}
            </div>
            <div className="text-dark-300 text-sm">Total Acres</div>
          </div>
        </div>
      </div>

      {/* Field Maps Display */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldMaps.map((map) => (
              <div
                key={map.id}
                className="bg-dark-700 rounded-lg overflow-hidden hover:bg-dark-600 transition-colors duration-200 cursor-pointer"
                onClick={() => setSelectedMap(map)}
              >
                <div className="aspect-video bg-dark-600 flex items-center justify-center">
                  {map.status === 'processing' ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-dark-300">Processing...</p>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500/20 to-dark-600 flex items-center justify-center">
                      <svg className="w-16 h-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-dark-100 font-medium truncate">{map.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(map.status)}`}>
                      {getStatusIcon(map.status)}
                      <span className="capitalize">{map.status}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-dark-400">
                    <p><span className="font-medium">Field:</span> {map.metadata.fieldName}</p>
                    <p><span className="font-medium">Area:</span> {map.metadata.area}</p>
                    <p><span className="font-medium">Crop:</span> {map.metadata.cropType}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(map.metadata.flightDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {fieldMaps.map((map) => (
              <div
                key={map.id}
                className="flex items-center space-x-4 p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors duration-200 cursor-pointer"
                onClick={() => setSelectedMap(map)}
              >
                <div className="w-20 h-20 bg-dark-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  {map.status === 'processing' ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  ) : (
                    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-dark-100 font-medium truncate">{map.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(map.status)}`}>
                      {getStatusIcon(map.status)}
                      <span className="capitalize">{map.status}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-dark-400">
                    <p><span className="font-medium">Field:</span> {map.metadata.fieldName}</p>
                    <p><span className="font-medium">Area:</span> {map.metadata.area}</p>
                    <p><span className="font-medium">Crop:</span> {map.metadata.cropType}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(map.metadata.flightDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-dark-400 hover:text-primary-400 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="p-2 text-dark-400 hover:text-primary-400 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Field Map Modal (placeholder for future implementation) */}
      {selectedMap && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-dark-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-primary-400">{selectedMap.name}</h3>
                <button
                  onClick={() => setSelectedMap(null)}
                  className="text-dark-400 hover:text-dark-100 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="aspect-video bg-dark-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="text-dark-300">Field map viewer will be implemented here</p>
                  <p className="text-dark-400 text-sm mt-2">
                    This would show the full-resolution field map with zoom, pan, and analysis tools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMapsView;
