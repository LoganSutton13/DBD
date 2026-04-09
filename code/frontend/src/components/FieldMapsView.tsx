import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import area from '@turf/area';
import 'leaflet/dist/leaflet.css';
import apiService from '../services/api';
import type { PrescriptionGeoJSON } from '../types/prescription';
import { normalizeUploadSettingsNodeOdm, type UploadSystemSettings } from '../types/upload';
import PathGenerationOptions from './PathGenerationOptions';

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface FieldMap {
  id: string;
  name: string;
  createdAt: string;
  geojsonUrl: string;
  geojsonData: PrescriptionGeoJSON | null;
  metadata: {
    fieldName: string;
    area: string; // in acres/hectares
    plotCount: number;
    avgNDVI?: number;
    minNDVI?: number;
    maxNDVI?: number;
  };
  status: 'processing' | 'completed' | 'failed';
  pathWaypoints: Array<{ lat: number; lon: number }>;
}

// Component to fit map bounds to GeoJSON
function FitBounds({
  geojsonData,
  pathPoints = [],
}: {
  geojsonData: PrescriptionGeoJSON | null;
  pathPoints?: Array<[number, number]>;
}) {
  const map = useMap();
  
  useEffect(() => {
    let bounds: L.LatLngBounds | null = null;
    if (geojsonData && geojsonData.features.length > 0) {
      const featureBounds = L.geoJSON(geojsonData as GeoJSON.GeoJSON).getBounds();
      if (featureBounds.isValid()) {
        bounds = featureBounds;
      }
    }
    if (pathPoints.length > 0) {
      const pathBounds = L.latLngBounds(pathPoints);
      if (pathBounds.isValid()) {
        bounds = bounds ? bounds.extend(pathBounds) : pathBounds;
      }
    }
    if (bounds?.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
      const padded = bounds.pad(0.05);
      map.setMaxBounds(padded);
      const targetZoom = map.getBoundsZoom(padded, false);
      if (!isNaN(targetZoom)) {
        map.setMinZoom(targetZoom - 1);
      }
    }
  }, [geojsonData, map, pathPoints]);
  
  return null;
}

function StartMarker({ position }: { position: [number, number] }) {
  const icon = L.divIcon({
    className: 'path-marker-start',
    html: '<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:11px;">S</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

function EndMarker({ position }: { position: [number, number] }) {
  const icon = L.divIcon({
    className: 'path-marker-end',
    html: '<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:11px;">E</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

// Component to render OpenStreetMap tiles when online
function BaseMapLayer({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) {
    // No tile layer when offline - blank background
    return null;
  }
  
  // Use OpenStreetMap tiles when online
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}

// Component to style GeoJSON features based on NDVI
function GeoJSONLayer({ data }: { data: PrescriptionGeoJSON }) {
  const style = (feature: any) => {
    return {
      fillColor: '#9ca3af',
      fillOpacity: 0.22,
      color: '#d1d5db',
      weight: 1.5,
      opacity: 0.85,
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature?.properties || {};
    const ndvi = props.NDVI_max_mean ?? props.NDVI_max_max ?? props.NDVI_max ?? props.NDVI_mean;
    const popupContent = `
      <div style="color: #000;">
        <strong>Plot ID:</strong> ${props.PlotID ?? props.id ?? 'N/A'}<br/>
        <strong>NDVI Max:</strong> ${ndvi !== undefined ? ndvi.toFixed(3) : 'N/A'}<br/>
        ${props.NDVI_mean !== undefined ? `<strong>NDVI Mean:</strong> ${props.NDVI_mean.toFixed(3)}<br/>` : ''}
        ${props.cluster !== undefined ? `<strong>Cluster:</strong> ${props.cluster}<br/>` : ''}
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  return <GeoJSON data={data as GeoJSON.GeoJSON} style={style} onEachFeature={onEachFeature} />;
}

const FieldMapsView: React.FC = () => {
  const [selectedMap, setSelectedMap] = useState<FieldMap | null>(null);
  const [isPathEditorOpen, setIsPathEditorOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fieldMaps, setFieldMaps] = useState<FieldMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [settings, setSettings] = useState<UploadSystemSettings | null>(null);
  const [pathHeading, setPathHeading] = useState(0);
  const [useDefaultRobotWidth, setUseDefaultRobotWidth] = useState(true);
  const [useDefaultCoverageWidth, setUseDefaultCoverageWidth] = useState(true);
  const [robotWidthOverride, setRobotWidthOverride] = useState(2.0);
  const [coverageWidthOverride, setCoverageWidthOverride] = useState(6.0);
  const [rtkBaseLongitude, setRtkBaseLongitude] = useState<number | ''>('');
  const [rtkBaseLatitude, setRtkBaseLatitude] = useState<number | ''>('');
  const [pathPreview, setPathPreview] = useState<Array<{ lat: number; lon: number }> | null>(null);
  const [pathJobId, setPathJobId] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [isSavingPath, setIsSavingPath] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Check internet connectivity
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // Try to fetch a small resource from OpenStreetMap
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('https://tile.openstreetmap.org/0/0/0.png', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        setIsOnline(response.ok);
      } catch (err) {
        // If fetch fails, we're offline
        setIsOnline(false);
      }
    };

    checkConnectivity();
  }, []);

  useEffect(() => {
    const loadPathSettings = async () => {
      try {
        const [loadedSettings, rtkBase] = await Promise.all([
          apiService.getUploadSettings(),
          apiService.getRtkBase(),
        ]);
        setSettings(normalizeUploadSettingsNodeOdm(loadedSettings));
        setRobotWidthOverride(loadedSettings.robot_width);
        setCoverageWidthOverride(loadedSettings.coverage_width);
        setRtkBaseLongitude(rtkBase.longitude);
        setRtkBaseLatitude(rtkBase.latitude);
      } catch {
        // Keep defaults when settings are unavailable.
      }
    };
    loadPathSettings();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isDeleteConfirmOpen) {
        setIsDeleteConfirmOpen(false);
        setDeleteConfirmText('');
        setDeleteError(null);
        return;
      }
      if (isPathEditorOpen) {
        setIsPathEditorOpen(false);
        return;
      }
      if (selectedMap) {
        setSelectedMap(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDeleteConfirmOpen, isPathEditorOpen, selectedMap]);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listRes = await apiService.listPrescriptions();
      const items = listRes.items || [];
      const loadedMaps: FieldMap[] = [];

      for (const item of items) {
        try {
          const geojsonData = await apiService.getPrescription(item.taskId);
          if (!geojsonData?.features?.length) continue;
          let pathWaypoints: Array<{ lat: number; lon: number }> = [];
          try {
            const pathRes = await apiService.getTaskDisplayPath(item.taskId);
            pathWaypoints = pathRes.waypoints || [];
          } catch {
            pathWaypoints = [];
          }

          const features = geojsonData.features;
          const ndviValues = features
            .map((f) => f.properties?.NDVI_max_mean ?? f.properties?.NDVI_max_max ?? f.properties?.NDVI_max ?? f.properties?.NDVI_mean)
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));

          const areaInSquareMeters = area(geojsonData as Parameters<typeof area>[0]);
          const areaInAcres = areaInSquareMeters / 4046.86;

          loadedMaps.push({
            id: item.taskId,
            name: item.taskName || `Task ${item.taskId.slice(0, 8)}`,
            createdAt: new Date().toISOString(),
            geojsonUrl: item.prescriptionUrl || `/api/v1/prescription/${item.taskId}`,
            geojsonData,
            metadata: {
              fieldName: item.taskName || item.taskId,
              area: areaInAcres > 0 ? `${areaInAcres.toFixed(2)} acres` : 'N/A',
              plotCount: features.length,
              avgNDVI: ndviValues.length > 0 ? ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length : undefined,
              minNDVI: ndviValues.length > 0 ? Math.min(...ndviValues) : undefined,
              maxNDVI: ndviValues.length > 0 ? Math.max(...ndviValues) : undefined,
            },
            status: 'completed',
            pathWaypoints,
          });
        } catch (err) {
          console.warn(`Failed to load prescription for task ${item.taskId}:`, err);
        }
      }

      setFieldMaps(loadedMaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load field maps');
      setFieldMaps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    setPathPreview(null);
    setPathJobId(null);
    setPathError(null);
    setIsPathEditorOpen(false);
  }, [selectedMap?.id]);

  const closeDeleteConfirm = () => {
    if (isDeletingTask) return;
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const openDeleteConfirm = () => {
    setDeleteConfirmText('');
    setDeleteError(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedMap || deleteConfirmText !== 'confirm') return;
    const taskIdToDelete = selectedMap.id;
    setIsDeletingTask(true);
    setDeleteError(null);
    try {
      await apiService.deleteTaskResults(taskIdToDelete);
      setIsDeleteConfirmOpen(false);
      setDeleteConfirmText('');
      setSelectedMap(null);
      await loadFromApi();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeletingTask(false);
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

  const downloadGeoJSON = (map: FieldMap) => {
    if (!map.geojsonData) return;
    
    const dataStr = JSON.stringify(map.geojsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.id}.geojson`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const activeMapWaypoints = pathPreview ?? selectedMap?.pathWaypoints ?? [];
  const activeMapPathLatLngs = activeMapWaypoints.map((point) => [point.lat, point.lon] as [number, number]);

  const generatePathPreview = async () => {
    if (!selectedMap) return;
    setIsGeneratingPath(true);
    setPathError(null);
    try {
      const robotWidth = useDefaultRobotWidth && settings ? settings.robot_width : robotWidthOverride;
      const coverageWidth = useDefaultCoverageWidth && settings ? settings.coverage_width : coverageWidthOverride;
      const accepted = await apiService.submitPathJobFromTask(
        selectedMap.id,
        pathHeading,
        robotWidth,
        coverageWidth,
        selectedMap.metadata.fieldName,
        {
          longitude: typeof rtkBaseLongitude === 'number' ? rtkBaseLongitude : 0,
          latitude: typeof rtkBaseLatitude === 'number' ? rtkBaseLatitude : 0,
        }
      );
      setPathJobId(accepted.path_job_id);
      while (true) {
        const status = await apiService.getPathJobStatus(accepted.path_job_id);
        if (status.status === 'failed') {
          throw new Error(status.error || 'Path generation failed');
        }
        if (status.status === 'completed') break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      const result = await apiService.getPathJobResult(accepted.path_job_id);
      setPathPreview(result.waypoints || []);
    } catch (err) {
      setPathError(err instanceof Error ? err.message : 'Failed to generate path');
    } finally {
      setIsGeneratingPath(false);
    }
  };

  const confirmGeneratedPath = async () => {
    if (!selectedMap || !pathJobId || !pathPreview) return;
    setIsSavingPath(true);
    setPathError(null);
    try {
      await apiService.savePathToTask(pathJobId, selectedMap.id);
      setSelectedMap((prev) => (prev ? { ...prev, pathWaypoints: pathPreview } : prev));
      setFieldMaps((prev) => prev.map((item) => (item.id === selectedMap.id ? { ...item, pathWaypoints: pathPreview } : item)));
      setIsPathEditorOpen(false);
    } catch (err) {
      setPathError(err instanceof Error ? err.message : 'Failed to save path');
    } finally {
      setIsSavingPath(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-300">Loading field maps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500 rounded-lg p-6">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

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
                const areaStr = m.metadata.area;
                if (areaStr === 'N/A') return sum;
                const area = parseFloat(areaStr.split(' ')[0]);
                return sum + (isNaN(area) ? 0 : area);
              }, 0).toFixed(1)}
            </div>
            <div className="text-dark-300 text-sm">Total Acres</div>
          </div>
        </div>
      </div>

      {/* Field Maps Display */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        {fieldMaps.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-dark-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-dark-300 text-lg mb-2">No field maps yet</p>
            <p className="text-dark-400 text-sm">
              Prescriptions are generated automatically when an orthophoto is ready and a boundary has been linked to the task. View the Prescriptions tab for status.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldMaps.map((map) => (
              <div
                key={map.id}
                className="bg-dark-700 rounded-lg overflow-hidden hover:bg-dark-600 transition-colors duration-200 cursor-pointer"
                onClick={() => setSelectedMap(map)}
              >
                <div className="aspect-video bg-dark-600 relative">
                  {map.status === 'processing' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <p className="text-dark-300">Processing...</p>
                      </div>
                    </div>
                  ) : map.geojsonData && !selectedMap ? (
                    <div className="w-full h-full">
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        attributionControl={false}
                      >
                        <BaseMapLayer isOnline={isOnline} />
                        <GeoJSONLayer data={map.geojsonData} />
                        <FitBounds geojsonData={map.geojsonData} />
                      </MapContainer>
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
                    <p><span className="font-medium">Plots:</span> {map.metadata.plotCount}</p>
                    {map.metadata.avgNDVI !== undefined && (
                      <p><span className="font-medium">Avg NDVI:</span> {map.metadata.avgNDVI.toFixed(3)}</p>
                    )}
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
                <div className="w-20 h-20 bg-dark-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {map.status === 'processing' ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  ) : map.geojsonData && !selectedMap ? (
                    <div className="w-full h-full">
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        attributionControl={false}
                      >
                        <BaseMapLayer isOnline={isOnline} />
                        <GeoJSONLayer data={map.geojsonData} />
                        <FitBounds geojsonData={map.geojsonData} />
                      </MapContainer>
                    </div>
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
                    <p><span className="font-medium">Plots:</span> {map.metadata.plotCount}</p>
                    {map.metadata.avgNDVI !== undefined ? (
                      <p><span className="font-medium">Avg NDVI:</span> {map.metadata.avgNDVI.toFixed(3)}</p>
                    ) : (
                      <p><span className="font-medium">Date:</span> {formatDate(map.createdAt)}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMap(map);
                    }}
                    className="p-2 text-dark-400 hover:text-primary-400 transition-colors duration-200"
                    title="View Map"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadGeoJSON(map);
                    }}
                    className="p-2 text-dark-400 hover:text-primary-400 transition-colors duration-200"
                    title="Download GeoJSON"
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

      {/* Field Map Modal with Expanded View */}
      {selectedMap && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              setSelectedMap(null);
            }
          }}
        >
          <div className="bg-dark-800 rounded-lg max-w-6xl w-full my-6 overflow-y-auto flex flex-col shadow-2xl border border-dark-700 max-h-[88vh] relative">
            <button
              onClick={() => setSelectedMap(null)}
              className="absolute top-3 right-3 z-20 p-2 bg-dark-950/80 text-dark-100 hover:text-white hover:bg-dark-700 rounded-full border border-dark-500 transition-colors duration-200"
              title="Close"
              aria-label="Close map view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Header */}
            <div className="p-5 border-b border-dark-700 bg-dark-800/95 backdrop-blur-sm sticky top-0 z-10 pr-16">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-2xl font-semibold text-primary-400">{selectedMap.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(selectedMap.status)}`}>
                      {getStatusIcon(selectedMap.status)}
                      <span className="capitalize">{selectedMap.status}</span>
                    </span>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-dark-700 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">Field Name</div>
                      <div className="text-sm font-medium text-dark-100">{selectedMap.metadata.fieldName}</div>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">Total Area</div>
                      <div className="text-sm font-medium text-dark-100">{selectedMap.metadata.area}</div>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">Plot Count</div>
                      <div className="text-sm font-medium text-dark-100">{selectedMap.metadata.plotCount}</div>
                    </div>
                    {selectedMap.metadata.avgNDVI !== undefined && (
                      <div className="bg-dark-700 rounded-lg p-3">
                        <div className="text-xs text-dark-400 mb-1">Avg NDVI</div>
                        <div className="text-sm font-medium text-primary-400">{selectedMap.metadata.avgNDVI.toFixed(3)}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setIsPathEditorOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                    title="Modify path"
                  >
                    Modify Path
                  </button>
                  <button
                    onClick={() => downloadGeoJSON(selectedMap)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 text-sm flex items-center space-x-2"
                    title="Download GeoJSON"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download</span>
                  </button>
                  <button
                    onClick={openDeleteConfirm}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm"
                    title="Delete task and all associated metadata"
                  >
                    Delete Task
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Main Map View - Takes 2/3 of space */}
                <div className="lg:col-span-2 flex flex-col">
                  <div className="flex-1 rounded-lg overflow-hidden border border-dark-700 bg-dark-900 min-h-[420px]">
                    {selectedMap.geojsonData ? (
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                      >
                        <BaseMapLayer isOnline={isOnline} />
                        <GeoJSONLayer data={selectedMap.geojsonData} />
                        {activeMapPathLatLngs.length > 0 && (
                          <>
                            <Polyline positions={activeMapPathLatLngs} pathOptions={{ color: '#22c55e', weight: 4 }} />
                            <StartMarker position={activeMapPathLatLngs[0]} />
                            <EndMarker position={activeMapPathLatLngs[activeMapPathLatLngs.length - 1]} />
                          </>
                        )}
                        <FitBounds geojsonData={selectedMap.geojsonData} pathPoints={activeMapPathLatLngs} />
                      </MapContainer>
                    ) : (
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <p className="text-dark-300">No GeoJSON data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Sidebar - Takes 1/3 of space */}
                <div className="lg:col-span-1 space-y-4 overflow-y-auto">
                  {/* NDVI Statistics */}
                  {(selectedMap.metadata.avgNDVI !== undefined || selectedMap.metadata.minNDVI !== undefined || selectedMap.metadata.maxNDVI !== undefined) && (
                    <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                      <h4 className="text-sm font-semibold text-primary-400 mb-3">NDVI Statistics</h4>
                      <div className="space-y-3">
                        {selectedMap.metadata.avgNDVI !== undefined && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-dark-400">Average</span>
                              <span className="text-sm font-medium text-dark-100">{selectedMap.metadata.avgNDVI.toFixed(3)}</span>
                            </div>
                            <div className="w-full bg-dark-600 rounded-full h-2">
                              <div 
                                className="bg-primary-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (selectedMap.metadata.avgNDVI + 1) * 50)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {selectedMap.metadata.minNDVI !== undefined && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-dark-400">Minimum</span>
                              <span className="text-sm font-medium text-dark-100">{selectedMap.metadata.minNDVI.toFixed(3)}</span>
                            </div>
                            <div className="w-full bg-dark-600 rounded-full h-2">
                              <div 
                                className="bg-red-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (selectedMap.metadata.minNDVI + 1) * 50)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {selectedMap.metadata.maxNDVI !== undefined && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-dark-400">Maximum</span>
                              <span className="text-sm font-medium text-dark-100">{selectedMap.metadata.maxNDVI.toFixed(3)}</span>
                            </div>
                            <div className="w-full bg-dark-600 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (selectedMap.metadata.maxNDVI + 1) * 50)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Field Information */}
                  <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                    <h4 className="text-sm font-semibold text-primary-400 mb-3">Field Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-400">Field Name:</span>
                        <span className="text-dark-100 font-medium">{selectedMap.metadata.fieldName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Total Area:</span>
                        <span className="text-dark-100 font-medium">{selectedMap.metadata.area}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Plot Count:</span>
                        <span className="text-dark-100 font-medium">{selectedMap.metadata.plotCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Created:</span>
                        <span className="text-dark-100 font-medium">{formatDate(selectedMap.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Path Points:</span>
                        <span className="text-dark-100 font-medium">{activeMapPathLatLngs.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* File Information */}
                  <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                    <h4 className="text-sm font-semibold text-primary-400 mb-3">File Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-400">GeoJSON:</span>
                        <a 
                          href={selectedMap.geojsonUrl} 
                          download
                          className="text-primary-400 hover:text-primary-300 underline"
                        >
                          Download
                        </a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Map Status:</span>
                        <span className={isOnline ? 'text-green-400' : 'text-yellow-400'}>
                          {isOnline ? 'Online (OSM)' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Path Overlay:</span>
                        <span className={activeMapPathLatLngs.length > 0 ? 'text-green-400' : 'text-dark-300'}>
                          {activeMapPathLatLngs.length > 0 ? 'Visible' : 'No saved path'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {isPathEditorOpen && (
            <div
              className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsPathEditorOpen(false);
              }}
            >
              <div className="w-full max-w-4xl rounded-lg border border-dark-600 bg-dark-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
                  <h4 className="text-lg font-semibold text-primary-400">Modify Path</h4>
                  <button
                    onClick={() => setIsPathEditorOpen(false)}
                    className="rounded-lg p-2 text-dark-300 hover:bg-dark-700 hover:text-dark-100"
                    aria-label="Close path editor"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4 p-5">
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
                      onClick={confirmGeneratedPath}
                      disabled={!pathPreview || !pathJobId || isSavingPath}
                      className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSavingPath ? 'Saving...' : 'Save Path'}
                    </button>
                  </div>
                  {pathError ? <p className="text-sm text-red-400">{pathError}</p> : null}
                  <div className="h-80 overflow-hidden rounded-lg border border-dark-600 bg-dark-900">
                    {activeMapPathLatLngs.length > 0 ? (
                      <MapContainer center={activeMapPathLatLngs[0]} zoom={16} style={{ height: '100%', width: '100%' }}>
                        <BaseMapLayer isOnline={isOnline} />
                        <Polyline positions={activeMapPathLatLngs} pathOptions={{ color: '#22c55e', weight: 4 }} />
                        <StartMarker position={activeMapPathLatLngs[0]} />
                        <EndMarker position={activeMapPathLatLngs[activeMapPathLatLngs.length - 1]} />
                        <FitBounds geojsonData={null} pathPoints={activeMapPathLatLngs} />
                      </MapContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-dark-400">
                        Generate a path to preview it here.
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-dark-400">
                    This uses the same heading, robot width, and boom width controls as Upload Step 3.
                  </p>
                </div>
              </div>
            </div>
          )}
          {isDeleteConfirmOpen && (
            <div
              className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeDeleteConfirm();
              }}
            >
              <div className="w-full max-w-lg rounded-lg border border-red-500/40 bg-dark-800 shadow-2xl">
                <div className="border-b border-dark-700 px-5 py-4">
                  <h4 className="text-lg font-semibold text-red-400">Delete Task</h4>
                </div>
                <div className="space-y-4 px-5 py-4">
                  <p className="text-sm text-red-300">
                    This action is not reversible. Deleting this task will permanently remove the task and all associated metadata/artifacts.
                  </p>
                  <p className="text-sm text-dark-300">
                    Type <span className="font-semibold text-dark-100">confirm</span> to continue.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type confirm"
                    className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 focus:border-red-500 focus:outline-none"
                    disabled={isDeletingTask}
                  />
                  {deleteError ? <p className="text-sm text-red-400">{deleteError}</p> : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-dark-700 px-5 py-4">
                  <button
                    onClick={closeDeleteConfirm}
                    disabled={isDeletingTask}
                    className="rounded-lg bg-dark-700 px-4 py-2 text-dark-100 hover:bg-dark-600 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    disabled={isDeletingTask || deleteConfirmText !== 'confirm'}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeletingTask ? 'Deleting...' : 'Delete Task'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FieldMapsView;
