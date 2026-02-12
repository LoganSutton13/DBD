import React, { useState } from 'react';

interface PesticidePrescription {
  id: string;
  name: string;
  createdAt: string;
  fieldMapId: string; // Reference to the field map this prescription is based on
  prescriptionUrl: string; // Path to the prescription map image
  thumbnailUrl: string;
  status: 'generating' | 'ready' | 'failed';
  metadata: {
    fieldName: string;
    cropType: string;
    pestType: string;
    pesticideType: string;
    applicationRate: string; // e.g., "2.5 L/ha"
    totalArea: string; // e.g., "45.2 acres"
    estimatedCost: string; // e.g., "$245.50"
    robotCompatible: boolean;
  };
  robotInstructions: {
    pathFile: string; // Path to robot navigation file
    waypoints: number;
    estimatedDuration: string; // e.g., "3h 45m"
    batteryRequired: string; // e.g., "85%"
  };
}

type SprayLevel = 'high' | 'low' | 'no';

const PesticidePrescriptionsView: React.FC = () => {
  const [selectedPrescription, setSelectedPrescription] = useState<PesticidePrescription | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'generating' | 'failed'>('all');
  const [sprayMap, setSprayMap] = useState<SprayLevel[][]>([]);
  const [selectedSprayLevel, setSelectedSprayLevel] = useState<SprayLevel>('high');
  const [gridSize, setGridSize] = useState({ rows: 8, cols: 12 });

  // TODO: REPLACE MOCK DATA WITH REAL BACKEND API CALL
  // Mock data - this would come from your Python backend after pesticide analysis
  const [prescriptions] = useState<PesticidePrescription[]>([
    {
      id: '1',
      name: 'North Field - Aphid Treatment',
      createdAt: '2024-01-15T14:30:00Z',
      fieldMapId: 'fieldmap-1',
      prescriptionUrl: '/api/prescriptions/north-field-aphid.jpg',
      thumbnailUrl: '/api/prescriptions/thumbnails/north-field-aphid.jpg',
      status: 'ready',
      metadata: {
        fieldName: 'North Field',
        cropType: 'Wheat',
        pestType: 'Aphids',
        pesticideType: 'Imidacloprid',
        applicationRate: '2.5 L/ha',
        totalArea: '45.2 acres',
        estimatedCost: '$245.50',
        robotCompatible: true,
      },
      robotInstructions: {
        pathFile: '/api/robot-paths/north-field-aphid.gpx',
        waypoints: 156,
        estimatedDuration: '3h 45m',
        batteryRequired: '85%',
      },
    },
    {
      id: '2',
      name: 'South Field - Fungus Control',
      createdAt: '2024-01-10T16:45:00Z',
      fieldMapId: 'fieldmap-2',
      prescriptionUrl: '/api/prescriptions/south-field-fungus.jpg',
      thumbnailUrl: '/api/prescriptions/thumbnails/south-field-fungus.jpg',
      status: 'ready',
      metadata: {
        fieldName: 'South Field',
        cropType: 'Corn',
        pestType: 'Fungal Infection',
        pesticideType: 'Chlorothalonil',
        applicationRate: '1.8 L/ha',
        totalArea: '67.8 acres',
        estimatedCost: '$389.20',
        robotCompatible: true,
      },
      robotInstructions: {
        pathFile: '/api/robot-paths/south-field-fungus.gpx',
        waypoints: 234,
        estimatedDuration: '5h 20m',
        batteryRequired: '92%',
      },
    },
    {
      id: '3',
      name: 'East Field - Weed Management',
      createdAt: '2024-01-20T11:15:00Z',
      fieldMapId: 'fieldmap-3',
      prescriptionUrl: '',
      thumbnailUrl: '',
      status: 'generating',
      metadata: {
        fieldName: 'East Field',
        cropType: 'Soybeans',
        pestType: 'Broadleaf Weeds',
        pesticideType: 'Glyphosate',
        applicationRate: '3.2 L/ha',
        totalArea: '32.1 acres',
        estimatedCost: '$156.80',
        robotCompatible: true,
      },
      robotInstructions: {
        pathFile: '',
        waypoints: 0,
        estimatedDuration: '2h 30m',
        batteryRequired: '70%',
      },
    },
  ]);

  // TODO: IMPLEMENT BACKEND INTEGRATION
  // Replace mock data with real API calls:
  /*
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const response = await fetch('/api/pesticide-prescriptions');
        if (!response.ok) {
          throw new Error('Failed to fetch prescriptions');
        }
        const data = await response.json();
        setPrescriptions(data);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
        // Handle error state
      }
    };

    fetchPrescriptions();
  }, []);

  // TODO: IMPLEMENT PRESCRIPTION GENERATION
  const generatePrescription = async (fieldMapId: string, pestType: string, pesticideType: string) => {
    try {
      const response = await fetch('/api/pesticide-prescriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldMapId, pestType, pesticideType }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate prescription');
      }
      
      const result = await response.json();
      // Refresh prescriptions list
      fetchPrescriptions();
      return result;
    } catch (error) {
      console.error('Prescription generation failed:', error);
    }
  };

  // TODO: IMPLEMENT ROBOT PATH DOWNLOAD
  const downloadRobotPath = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/pesticide-prescriptions/${prescriptionId}/robot-path`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `robot-path-${prescriptionId}.gpx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  */

  // Initialize spray map grid when prescription is selected
  React.useEffect(() => {
    if (selectedPrescription) {
      const initialGrid: SprayLevel[][] = Array(gridSize.rows)
        .fill(null)
        .map(() => Array(gridSize.cols).fill('no' as SprayLevel));
      setSprayMap(initialGrid);
    } else {
      setSprayMap([]);
    }
  }, [selectedPrescription, gridSize.rows, gridSize.cols]);

  const handleGridCellClick = (row: number, col: number) => {
    const newSprayMap = sprayMap.map((r, rIdx) =>
      r.map((cell, cIdx) => (rIdx === row && cIdx === col ? selectedSprayLevel : cell))
    );
    setSprayMap(newSprayMap);
  };

  const handleBulkApply = (level: SprayLevel) => {
    const newSprayMap = sprayMap.map(row => row.map(() => level));
    setSprayMap(newSprayMap);
  };

  const getSprayLevelColor = (level: SprayLevel) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/80 hover:bg-red-500';
      case 'low':
        return 'bg-yellow-500/80 hover:bg-yellow-500';
      case 'no':
        return 'bg-gray-600/50 hover:bg-gray-600';
      default:
        return 'bg-gray-600/50';
    }
  };

  const getSprayLevelLabel = (level: SprayLevel) => {
    switch (level) {
      case 'high':
        return 'High Spray';
      case 'low':
        return 'Low Spray';
      case 'no':
        return 'No Spray';
    }
  };

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
      case 'ready':
        return 'bg-green-500/20 text-green-400';
      case 'generating':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-dark-500/20 text-dark-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'generating':
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

  const filteredPrescriptions = prescriptions.filter(p => 
    filterStatus === 'all' || p.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary-400 mb-2">
              Pesticide Prescriptions
            </h2>
            <p className="text-dark-300">
              AI-generated pesticide application maps for agricultural robots
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All Prescriptions</option>
              <option value="ready">Ready</option>
              <option value="generating">Generating</option>
              <option value="failed">Failed</option>
            </select>
            
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
            
            {/* Generate New Prescription */}
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200">
              Generate New
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary-400">{prescriptions.length}</div>
            <div className="text-dark-300 text-sm">Total Prescriptions</div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {prescriptions.filter(p => p.status === 'ready').length}
            </div>
            <div className="text-dark-300 text-sm">Ready for Robot</div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {prescriptions.filter(p => p.status === 'generating').length}
            </div>
            <div className="text-dark-300 text-sm">Generating</div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              ${prescriptions
                .filter(p => p.status === 'ready')
                .reduce((sum, p) => sum + parseFloat(p.metadata.estimatedCost.replace('$', '')), 0)
                .toFixed(2)}
            </div>
            <div className="text-dark-300 text-sm">Total Estimated Cost</div>
          </div>
        </div>
      </div>

      {/* Prescriptions Display */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-dark-700 rounded-lg overflow-hidden hover:bg-dark-600 transition-colors duration-200 cursor-pointer"
                onClick={() => setSelectedPrescription(prescription)}
              >
                <div className="aspect-video bg-dark-600 flex items-center justify-center">
                  {prescription.status === 'generating' ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-dark-300">Generating...</p>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-dark-600 flex items-center justify-center">
                      <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-dark-100 font-medium truncate">{prescription.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(prescription.status)}`}>
                      {getStatusIcon(prescription.status)}
                      <span className="capitalize">{prescription.status}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-dark-400">
                    <p><span className="font-medium">Field:</span> {prescription.metadata.fieldName}</p>
                    <p><span className="font-medium">Pest:</span> {prescription.metadata.pestType}</p>
                    <p><span className="font-medium">Pesticide:</span> {prescription.metadata.pesticideType}</p>
                    <p><span className="font-medium">Cost:</span> {prescription.metadata.estimatedCost}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      {prescription.metadata.robotCompatible && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                          Robot Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="flex items-center space-x-4 p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors duration-200 cursor-pointer"
                onClick={() => setSelectedPrescription(prescription)}
              >
                <div className="w-20 h-20 bg-dark-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  {prescription.status === 'generating' ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  ) : (
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-dark-100 font-medium truncate">{prescription.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(prescription.status)}`}>
                      {getStatusIcon(prescription.status)}
                      <span className="capitalize">{prescription.status}</span>
                    </span>
                    {prescription.metadata.robotCompatible && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        Robot Ready
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-dark-400">
                    <p><span className="font-medium">Field:</span> {prescription.metadata.fieldName}</p>
                    <p><span className="font-medium">Pest:</span> {prescription.metadata.pestType}</p>
                    <p><span className="font-medium">Pesticide:</span> {prescription.metadata.pesticideType}</p>
                    <p><span className="font-medium">Cost:</span> {prescription.metadata.estimatedCost}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-2 text-dark-400 hover:text-primary-400 transition-colors duration-200"
                    title="View Prescription Map"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button 
                    className="p-2 text-dark-400 hover:text-green-400 transition-colors duration-200"
                    title="Download Robot Path"
                  >
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

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-dark-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-primary-400">{selectedPrescription.name}</h3>
                  <p className="text-dark-300 text-sm mt-1">
                    Generated on {formatDate(selectedPrescription.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="text-dark-400 hover:text-dark-100 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prescription Map with Spray Settings */}
                <div>
                  <h4 className="text-lg font-medium text-primary-400 mb-4">Spray Map Settings</h4>
                  
                  {/* Spray Level Selector */}
                  <div className="bg-dark-700 rounded-lg p-4 mb-4">
                    <label className="block text-sm font-medium text-dark-200 mb-3">
                      Select Spray Level
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedSprayLevel('high')}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          selectedSprayLevel === 'high'
                            ? 'bg-red-500 text-white'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        High Spray
                      </button>
                      <button
                        onClick={() => setSelectedSprayLevel('low')}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          selectedSprayLevel === 'low'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        }`}
                      >
                        Low Spray
                      </button>
                      <button
                        onClick={() => setSelectedSprayLevel('no')}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          selectedSprayLevel === 'no'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                      >
                        No Spray
                      </button>
                    </div>
                  </div>

                  {/* Bulk Apply Buttons */}
                  <div className="bg-dark-700 rounded-lg p-4 mb-4">
                    <label className="block text-sm font-medium text-dark-200 mb-3">
                      Bulk Apply to Entire Field
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleBulkApply('high')}
                        className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors duration-200 text-sm font-medium"
                      >
                        Apply High
                      </button>
                      <button
                        onClick={() => handleBulkApply('low')}
                        className="flex-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors duration-200 text-sm font-medium"
                      >
                        Apply Low
                      </button>
                      <button
                        onClick={() => handleBulkApply('no')}
                        className="flex-1 px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-colors duration-200 text-sm font-medium"
                      >
                        Apply No Spray
                      </button>
                    </div>
                  </div>

                  {/* Grid Field Map */}
                  <div className="bg-dark-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-dark-200">
                        Field Map Grid
                      </label>
                      <p className="text-xs text-dark-400">
                        Click cells to apply {getSprayLevelLabel(selectedSprayLevel).toLowerCase()}
                      </p>
                    </div>
                    <div className="bg-dark-800 rounded-lg p-3 overflow-auto">
                      {sprayMap.length > 0 ? (
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))` }}>
                          {sprayMap.map((row, rowIdx) =>
                            row.map((cell, colIdx) => (
                              <button
                                key={`${rowIdx}-${colIdx}`}
                                onClick={() => handleGridCellClick(rowIdx, colIdx)}
                                className={`aspect-square min-w-[24px] rounded transition-all duration-150 ${getSprayLevelColor(cell)} border border-dark-600 hover:border-dark-400`}
                                title={`Row ${rowIdx + 1}, Col ${colIdx + 1}: ${getSprayLevelLabel(cell)}`}
                              />
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-dark-400">
                          <p>Loading field map grid...</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 flex justify-center space-x-4 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500/80 rounded"></div>
                        <span className="text-dark-300">High Spray</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-yellow-500/80 rounded"></div>
                        <span className="text-dark-300">Low Spray</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-600/50 rounded"></div>
                        <span className="text-dark-300">No Spray</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Prescription Details */}
                <div>
                  <h4 className="text-lg font-medium text-primary-400 mb-4">Application Details</h4>
                  <div className="space-y-4">
                    <div className="bg-dark-700 rounded-lg p-4">
                      <h5 className="font-medium text-dark-100 mb-3">Treatment Information</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-400">Field:</span>
                          <span className="text-dark-100">{selectedPrescription.metadata.fieldName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Crop Type:</span>
                          <span className="text-dark-100">{selectedPrescription.metadata.cropType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Pest Type:</span>
                          <span className="text-dark-100">{selectedPrescription.metadata.pestType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Pesticide:</span>
                          <span className="text-dark-100">{selectedPrescription.metadata.pesticideType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Application Rate:</span>
                          <span className="text-dark-100">{selectedPrescription.metadata.applicationRate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Total Area:</span>
                          <span className="text-dark-100">{selectedPrescription.metadata.totalArea}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Estimated Cost:</span>
                          <span className="text-green-400 font-medium">{selectedPrescription.metadata.estimatedCost}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-dark-700 rounded-lg p-4">
                      <h5 className="font-medium text-dark-100 mb-3">Robot Instructions</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-400">Waypoints:</span>
                          <span className="text-dark-100">{selectedPrescription.robotInstructions.waypoints}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Duration:</span>
                          <span className="text-dark-100">{selectedPrescription.robotInstructions.estimatedDuration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Battery Required:</span>
                          <span className="text-dark-100">{selectedPrescription.robotInstructions.batteryRequired}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Robot Compatible:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            selectedPrescription.metadata.robotCompatible 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {selectedPrescription.metadata.robotCompatible ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              {selectedPrescription.status === 'ready' && (
                <div className="mt-6 flex justify-center space-x-4">
                  <button className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200">
                    Download Prescription Map
                  </button>
                  <button className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200">
                    Download Robot Path (GPX)
                  </button>
                  <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200">
                    Send to Robot
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesticidePrescriptionsView;
