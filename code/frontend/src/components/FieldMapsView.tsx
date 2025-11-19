import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GeoJSONFeature {
  type: string;
  properties: {
    PlotID?: number;
    NDVI_max?: number;
    NDVI_mean?: number;
    cluster?: number;
    id?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

interface FieldMap {
  id: string;
  name: string;
  createdAt: string;
  geojsonUrl: string;
  geojsonData: GeoJSONData | null;
  imageUrl?: string; // Optional JPEG image URL for the field
  metadata: {
    fieldName: string;
    area: string; // in acres/hectares
    plotCount: number;
    avgNDVI?: number;
    minNDVI?: number;
    maxNDVI?: number;
  };
  status: 'processing' | 'completed' | 'failed';
}

// Component to fit map bounds to GeoJSON or image
function FitBounds({ geojsonData, imageBounds }: { geojsonData: GeoJSONData | null; imageBounds?: L.LatLngBounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (imageBounds && imageBounds.isValid()) {
      // If we have image bounds, use those
      map.fitBounds(imageBounds, { padding: [20, 20] });
    } else if (geojsonData && geojsonData.features.length > 0) {
      // Otherwise use GeoJSON bounds
      const bounds = L.geoJSON(geojsonData as any).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [geojsonData, imageBounds, map]);
  
  return null;
}

// Calculate bounds from GeoJSON for image overlay
function calculateGeoJSONBounds(geojsonData: GeoJSONData | null): L.LatLngBounds | null {
  if (!geojsonData || geojsonData.features.length === 0) return null;
  
  const bounds = L.geoJSON(geojsonData as any).getBounds();
  return bounds.isValid() ? bounds : null;
}

// Component to render either image overlay or tile layer
function BaseMapLayer({ imageUrl, geojsonData }: { imageUrl?: string; geojsonData: GeoJSONData | null }) {
  const imageBounds = geojsonData ? calculateGeoJSONBounds(geojsonData) : null;
  
  if (imageUrl && imageBounds) {
    // Use image overlay if image URL and bounds are available
    return (
      <ImageOverlay
        url={imageUrl}
        bounds={imageBounds}
        opacity={1}
      />
    );
  }
  
  // Fall back to tile layer if no image
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  );
}

// Component to style GeoJSON features based on NDVI
function GeoJSONLayer({ data }: { data: GeoJSONData }) {
  const getNDVIColor = (ndvi: number | undefined): string => {
    if (ndvi === undefined || isNaN(ndvi)) return '#808080';
    
    // NDVI typically ranges from -1 to 1, but for vegetation it's usually 0 to 1
    // Color scale: red (low) -> yellow -> green (high)
    if (ndvi < 0.2) return '#d73027'; // Red - low vegetation
    if (ndvi < 0.4) return '#f46d43'; // Orange-red
    if (ndvi < 0.5) return '#fee08b'; // Yellow
    if (ndvi < 0.6) return '#abdda4'; // Light green
    if (ndvi < 0.7) return '#66c2a5'; // Green
    return '#3288bd'; // Blue-green - high vegetation
  };

  const style = (feature: any) => {
    const props = feature?.properties || {};
    const ndvi = props.NDVI_max ?? props.NDVI_mean;
    return {
      fillColor: getNDVIColor(ndvi),
      fillOpacity: 0.7,
      color: '#ffffff',
      weight: 1,
      opacity: 0.5,
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature?.properties || {};
    const ndvi = props.NDVI_max ?? props.NDVI_mean;
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

  return <GeoJSON data={data as any} style={style} onEachFeature={onEachFeature} />;
}

const FieldMapsView: React.FC = () => {
  const [selectedMap, setSelectedMap] = useState<FieldMap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fieldMaps, setFieldMaps] = useState<FieldMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load GeoJSON files from public/geojson folder
  useEffect(() => {
    const loadGeoJSONFiles = async () => {
      try {
        setLoading(true);
        setError(null);

        // List of known GeoJSON files with their corresponding images (you can expand this or fetch from an API)
        const geojsonFiles = [
          { 
            filename: 'field_ndvi_python.geojson', 
            name: 'Field NDVI Analysis',
            imageUrl: '/images/field_ndvi_python.jpg' // Optional: path to corresponding JPEG image
          }
        ];

        const loadedMaps: FieldMap[] = [];

        for (const file of geojsonFiles) {
          try {
            const response = await fetch(`/geojson/${file.filename}`);
            
            if (!response.ok) {
              // If file doesn't exist or is empty, skip it
              if (response.status === 404) {
                console.warn(`GeoJSON file not found: ${file.filename}`);
                continue;
              }
              throw new Error(`Failed to load ${file.filename}: ${response.statusText}`);
            }

            const text = await response.text();
            
            // Check if file is empty
            if (!text || text.trim().length === 0) {
              console.warn(`GeoJSON file is empty: ${file.filename}`);
              continue;
            }

            const geojsonData: GeoJSONData = JSON.parse(text);

            // Validate GeoJSON structure
            if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
              console.warn(`GeoJSON file has no features: ${file.filename}`);
              continue;
            }

            // Calculate metadata from GeoJSON
            const features = geojsonData.features;
            const ndviValues = features
              .map(f => f.properties.NDVI_max ?? f.properties.NDVI_mean)
              .filter((v): v is number => v !== undefined && !isNaN(v));

            // Calculate area from geometries (approximate)
            let totalArea = 0;
            features.forEach(feature => {
              if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0]) {
                const coords = feature.geometry.coordinates[0] as number[][];
                // Simple shoelace formula for polygon area
                let area = 0;
                for (let i = 0; i < coords.length - 1; i++) {
                  const x1 = coords[i][0] as number;
                  const y1 = coords[i][1] as number;
                  const x2 = coords[i + 1][0] as number;
                  const y2 = coords[i + 1][1] as number;
                  area += x1 * y2;
                  area -= x2 * y1;
                }
                totalArea += Math.abs(area) / 2;
              }
            });

            // Convert to acres (rough approximation: 1 degree ≈ 69 miles, 1 square degree ≈ 4761 square miles)
            // This is a rough estimate; for accurate area, you'd need proper coordinate transformation
            const areaInAcres = (totalArea * 0.000247105) || 0; // Rough conversion

            // Calculate bounds for image overlay
            const bounds = calculateGeoJSONBounds(geojsonData);

            const map: FieldMap = {
              id: file.filename.replace('.geojson', ''),
              name: file.name || file.filename.replace('.geojson', '').replace(/_/g, ' '),
              createdAt: new Date().toISOString(), // You might want to get this from file metadata
              geojsonUrl: `/geojson/${file.filename}`,
              geojsonData: geojsonData,
              imageUrl: file.imageUrl, // Optional image URL
              metadata: {
                fieldName: file.name || 'Field',
                area: areaInAcres > 0 ? `${areaInAcres.toFixed(2)} acres` : 'N/A',
                plotCount: features.length,
                avgNDVI: ndviValues.length > 0 
                  ? ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length 
                  : undefined,
                minNDVI: ndviValues.length > 0 ? Math.min(...ndviValues) : undefined,
                maxNDVI: ndviValues.length > 0 ? Math.max(...ndviValues) : undefined,
              },
              status: 'completed',
            };

            loadedMaps.push(map);
          } catch (err) {
            console.error(`Error loading ${file.filename}:`, err);
            // Continue loading other files even if one fails
          }
        }

        setFieldMaps(loadedMaps);
        setLoading(false);
      } catch (err) {
        console.error('Error loading GeoJSON files:', err);
        setError(err instanceof Error ? err.message : 'Failed to load field maps');
        setLoading(false);
      }
    };

    loadGeoJSONFiles();
  }, []);

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
            <p className="text-dark-300 text-lg mb-2">No field maps found</p>
            <p className="text-dark-400 text-sm">
              Add GeoJSON files to the <code className="bg-dark-700 px-2 py-1 rounded">public/geojson</code> folder
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
                  ) : map.geojsonData ? (
                    <div className="w-full h-full">
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        attributionControl={false}
                      >
                        <BaseMapLayer imageUrl={map.imageUrl} geojsonData={map.geojsonData} />
                        <GeoJSONLayer data={map.geojsonData} />
                        <FitBounds geojsonData={map.geojsonData} imageBounds={map.imageUrl ? (calculateGeoJSONBounds(map.geojsonData) || undefined) : undefined} />
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
                  ) : map.geojsonData ? (
                    <div className="w-full h-full">
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        attributionControl={false}
                      >
                        <BaseMapLayer imageUrl={map.imageUrl} geojsonData={map.geojsonData} />
                        <GeoJSONLayer data={map.geojsonData} />
                        <FitBounds geojsonData={map.geojsonData} imageBounds={map.imageUrl ? (calculateGeoJSONBounds(map.geojsonData) || undefined) : undefined} />
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

      {/* Field Map Modal with Interactive Map */}
      {selectedMap && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-dark-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-primary-400">{selectedMap.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-dark-300">
                    <span><span className="font-medium">Field:</span> {selectedMap.metadata.fieldName}</span>
                    <span><span className="font-medium">Area:</span> {selectedMap.metadata.area}</span>
                    <span><span className="font-medium">Plots:</span> {selectedMap.metadata.plotCount}</span>
                    {selectedMap.metadata.avgNDVI !== undefined && (
                      <span><span className="font-medium">Avg NDVI:</span> {selectedMap.metadata.avgNDVI.toFixed(3)}</span>
                    )}
                    {selectedMap.metadata.minNDVI !== undefined && (
                      <span><span className="font-medium">Min NDVI:</span> {selectedMap.metadata.minNDVI.toFixed(3)}</span>
                    )}
                    {selectedMap.metadata.maxNDVI !== undefined && (
                      <span><span className="font-medium">Max NDVI:</span> {selectedMap.metadata.maxNDVI.toFixed(3)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadGeoJSON(selectedMap)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 text-sm"
                    title="Download GeoJSON"
                  >
                    Download
                  </button>
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
            </div>
            <div className="flex-1 p-6 overflow-hidden">
              {selectedMap.geojsonData ? (
                <div className="w-full h-full rounded-lg overflow-hidden border border-dark-700">
                  <MapContainer
                    center={[0, 0]}
                    zoom={2}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <BaseMapLayer imageUrl={selectedMap.imageUrl} geojsonData={selectedMap.geojsonData} />
                    <GeoJSONLayer data={selectedMap.geojsonData} />
                    <FitBounds geojsonData={selectedMap.geojsonData} imageBounds={selectedMap.imageUrl ? (calculateGeoJSONBounds(selectedMap.geojsonData) || undefined) : undefined} />
                  </MapContainer>
                </div>
              ) : (
                <div className="aspect-video bg-dark-700 rounded-lg flex items-center justify-center">
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
        </div>
      )}
    </div>
  );
};

export default FieldMapsView;
