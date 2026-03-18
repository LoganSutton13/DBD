import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiService from '../services/api';
import type {
  PrescriptionListItem,
  PrescriptionStatus,
  SprayLevel,
  PrescriptionGeoJSON,
  PrescriptionFeature,
} from '../types/prescription';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FitBounds({ geojsonData }: { geojsonData: PrescriptionGeoJSON | null }) {
  const map = useMap();
  useEffect(() => {
    if (geojsonData?.features?.length) {
      const bounds = L.geoJSON(geojsonData as GeoJSON.GeoJSON).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geojsonData, map]);
  return null;
}

const PesticidePrescriptionsView: React.FC = () => {
  const [items, setItems] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailGeojson, setDetailGeojson] = useState<PrescriptionGeoJSON | null>(null);
  const [detailStatus, setDetailStatus] = useState<{ status: PrescriptionStatus; message?: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sprayUpdates, setSprayUpdates] = useState<Record<string, SprayLevel>>({});
  const [savingSpray, setSavingSpray] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.listPrescriptions();
      setItems(res.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load prescriptions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = useCallback(async (taskId: string) => {
    setSelectedTaskId(taskId);
    setDetailGeojson(null);
    setDetailStatus(null);
    setSprayUpdates({});
    setDetailLoading(true);
    try {
      const [geojson, status] = await Promise.all([
        apiService.getPrescription(taskId),
        apiService.getPrescriptionStatus(taskId),
      ]);
      setDetailGeojson(geojson?.features ? geojson : null);
      setDetailStatus({ status: status.status, message: status.message });
      const initial: Record<string, SprayLevel> = {};
      if (geojson?.features) {
        for (const f of geojson.features) {
          const id = f.id != null ? String(f.id) : f.properties?.id != null ? String(f.properties.id) : undefined;
          const spray = f.properties?.spray;
          if (id && spray) initial[id] = spray;
        }
      }
      setSprayUpdates(initial);
    } catch (e) {
      setDetailStatus({ status: 'failed', message: e instanceof Error ? e.message : 'Failed to load' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedTaskId(null);
    setDetailGeojson(null);
    setDetailStatus(null);
    setSprayUpdates({});
  }, []);

  const getFeatureId = (feature: PrescriptionFeature): string | null => {
    if (feature.id != null) return String(feature.id);
    if (feature.properties?.id != null) return String(feature.properties.id);
    return null;
  };

  const getSprayForFeature = (feature: PrescriptionFeature): SprayLevel => {
    const id = getFeatureId(feature);
    if (id && sprayUpdates[id] !== undefined) return sprayUpdates[id];
    const p = feature.properties?.spray as string | undefined;
    if (p === 'none' || p === 'low' || p === 'high') return p as SprayLevel;
    return 'none';
  };

  const setSprayForFeature = (featureId: string, level: SprayLevel) => {
    setSprayUpdates((prev) => ({ ...prev, [featureId]: level }));
  };

  const saveSprayUpdates = useCallback(async () => {
    if (!selectedTaskId) return;
    const updates = Object.entries(sprayUpdates).map(([featureId, spray]) => ({ featureId, spray }));
    if (updates.length === 0) return;
    setSavingSpray(true);
    try {
      const updated = await apiService.updatePrescription(selectedTaskId, { updates });
      setDetailGeojson(updated?.features ? updated : detailGeojson);
    } catch (e) {
      console.error('Failed to save spray updates', e);
    } finally {
      setSavingSpray(false);
    }
  }, [selectedTaskId, sprayUpdates, detailGeojson]);

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
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />;
      case 'processing':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
      case 'failed':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />;
      default:
        return null;
    }
  };

  const filteredItems = filterStatus === 'all' ? items : items;

  const selectedItem = selectedTaskId ? items.find((i) => i.taskId === selectedTaskId) : null;

  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary-400 mb-2">Prescriptions</h2>
            <p className="text-dark-300">
              Prescription maps generated from orthophotos when a boundary is linked. View and edit spray levels.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed')}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
            </select>
            <div className="flex bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-dark-300 hover:text-dark-100'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-dark-300 hover:text-dark-100'}`}
              >
                List
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary-400">{items.length}</div>
            <div className="text-dark-300 text-sm">Total Prescriptions</div>
          </div>
        </div>
      </div>

      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            <p className="text-lg mb-2">No prescriptions yet</p>
            <p className="text-sm">
              Prescriptions are generated automatically when an orthophoto is ready and a boundary has been linked to the task.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.taskId}
                className="bg-dark-700 rounded-lg overflow-hidden hover:bg-dark-600 transition-colors cursor-pointer"
                onClick={() => openDetail(item.taskId)}
              >
                <div className="aspect-video bg-dark-600 flex items-center justify-center">
                  <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="p-4">
                  <h3 className="text-dark-100 font-medium truncate">{item.taskName || `Task ${item.taskId}`}</h3>
                  <p className="text-dark-400 text-sm mt-1">Task: {item.taskId.slice(0, 8)}…</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.taskId}
                className="flex items-center space-x-4 p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors cursor-pointer"
                onClick={() => openDetail(item.taskId)}
              >
                <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-dark-100 font-medium truncate">{item.taskName || `Task ${item.taskId}`}</h3>
                  <p className="text-dark-400 text-sm">Task: {item.taskId.slice(0, 8)}…</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Completed</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div
            className="bg-dark-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-dark-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-primary-400">
                  {selectedItem?.taskName || `Task ${selectedTaskId}`}
                </h3>
                {detailStatus && (
                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-1 rounded text-xs ${getStatusColor(detailStatus.status)}`}>
                    {detailStatus.status}
                    {detailStatus.message && ` — ${detailStatus.message}`}
                  </span>
                )}
              </div>
              <button onClick={closeDetail} className="text-dark-400 hover:text-dark-100 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                </div>
              ) : detailStatus?.status === 'failed' ? (
                <div className="space-y-3">
                  <p className="text-red-400">{detailStatus.message}</p>
                  {detailStatus.message?.toLowerCase().includes('boundary') && (
                    <p className="text-dark-300 text-sm">
                      Link a boundary to this field in the <strong>Pathing</strong> tab: upload a shapefile, generate the path, then use &quot;Link to Stitched Field&quot; and choose this task. After saving, prescription generation will run automatically.
                    </p>
                  )}
                </div>
              ) : detailGeojson?.features?.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-primary-400 mb-2">Prescription Map</h4>
                    <div className="h-80 rounded-lg overflow-hidden border border-dark-600">
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl
                        attributionControl={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          maxZoom={19}
                        />
                        <GeoJSON
                          data={detailGeojson as GeoJSON.GeoJSON}
                          style={(feature) => {
                            const spray = getSprayForFeature(feature as unknown as PrescriptionFeature);
                            const fill = spray === 'high' ? '#ef4444' : spray === 'low' ? '#eab308' : '#6b7280';
                            return { fillColor: fill, fillOpacity: 0.7, color: '#fff', weight: 1 };
                          }}
                          onEachFeature={(feature, layer) => {
                            const fid = getFeatureId(feature as unknown as PrescriptionFeature);
                            if (fid) {
                              layer.bindPopup(
                                `<div class="text-black">
                                  <strong>Feature:</strong> ${fid}<br/>
                                  <strong>Spray:</strong> ${getSprayForFeature(feature as unknown as PrescriptionFeature)}
                                </div>`
                              );
                            }
                          }}
                        />
                        <FitBounds geojsonData={detailGeojson} />
                      </MapContainer>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-primary-400 mb-2">Spray by cluster</h4>
                    <p className="text-dark-400 text-sm mb-4">
                      Set spray level per feature and click Save to update the prescription.
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {detailGeojson.features.map((f, idx) => {
                        const fid = getFeatureId(f) ?? `feature-${idx}`;
                        const spray = getSprayForFeature(f);
                        return (
                          <div key={fid} className="flex items-center justify-between bg-dark-700 rounded px-3 py-2">
                            <span className="text-dark-200 text-sm">
                              {fid} {f.properties?.cluster != null && `(cluster ${f.properties.cluster})`}
                            </span>
                            <select
                              value={spray}
                              onChange={(e) => setSprayForFeature(fid, e.target.value as SprayLevel)}
                              className="bg-dark-600 text-dark-100 border border-dark-500 rounded px-2 py-1 text-sm"
                            >
                              <option value="none">None</option>
                              <option value="low">Low</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={saveSprayUpdates}
                      disabled={savingSpray || Object.keys(sprayUpdates).length === 0}
                      className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingSpray ? 'Saving…' : 'Save spray updates'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-dark-400">No GeoJSON features to display.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesticidePrescriptionsView;
