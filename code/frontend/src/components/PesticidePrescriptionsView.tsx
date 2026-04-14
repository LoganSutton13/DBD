import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  PrescriptionConfig,
} from '../types/prescription';
import { computePrescriptionTotalGallons } from '../utils/prescriptionGallons';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** String fields for the regenerate form (empty = leave existing config unchanged on save). */
interface RegenerateFormDraft {
  heading: string;
  cell_size: string;
  cluster_count: string;
  smoothing_rounds: string;
  smoothing_sigma: string;
  maximum_vertices: string;
  ndvi_threshold: string;
  spray_rate_gpa_none: string;
  spray_rate_gpa_low: string;
  spray_rate_gpa_high: string;
}

function configToRegenerateDraft(c: PrescriptionConfig | null): RegenerateFormDraft {
  const z = (v: number | undefined | null) => (v != null && !Number.isNaN(v) ? String(v) : '');
  const cfg = c ?? {};
  return {
    heading: z(cfg.heading),
    cell_size: z(cfg.cell_size),
    cluster_count: z(cfg.cluster_count),
    smoothing_rounds: z(cfg.smoothing_rounds),
    smoothing_sigma: z(cfg.smoothing_sigma),
    maximum_vertices: z(cfg.maximum_vertices),
    ndvi_threshold: z(cfg.ndvi_threshold),
    spray_rate_gpa_none: z(cfg.spray_rate_gpa_none),
    spray_rate_gpa_low: z(cfg.spray_rate_gpa_low),
    spray_rate_gpa_high: z(cfg.spray_rate_gpa_high),
  };
}

function mergeDraftIntoConfig(base: PrescriptionConfig, d: RegenerateFormDraft): PrescriptionConfig {
  const merged: PrescriptionConfig = { ...base };

  const parseFloatField = (raw: string): number | undefined => {
    const t = raw.trim();
    if (t === '') return undefined;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const parseIntField = (raw: string): number | undefined => {
    const t = raw.trim();
    if (t === '') return undefined;
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const setNum = (key: keyof PrescriptionConfig, v: number | undefined) => {
    if (v !== undefined) {
      (merged as Record<string, number>)[key] = v;
    }
  };

  setNum('heading', parseFloatField(d.heading));
  setNum('cell_size', parseFloatField(d.cell_size));
  setNum('cluster_count', parseIntField(d.cluster_count));
  setNum('smoothing_rounds', parseIntField(d.smoothing_rounds));
  setNum('smoothing_sigma', parseIntField(d.smoothing_sigma));
  setNum('maximum_vertices', parseIntField(d.maximum_vertices));
  setNum('ndvi_threshold', parseFloatField(d.ndvi_threshold));
  setNum('spray_rate_gpa_none', parseFloatField(d.spray_rate_gpa_none));
  setNum('spray_rate_gpa_low', parseFloatField(d.spray_rate_gpa_low));
  setNum('spray_rate_gpa_high', parseFloatField(d.spray_rate_gpa_high));

  return merged;
}

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
  const [detailConfig, setDetailConfig] = useState<PrescriptionConfig | null>(null);
  const [thresholdsModalOpen, setThresholdsModalOpen] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [draftGpaNone, setDraftGpaNone] = useState('');
  const [draftGpaLow, setDraftGpaLow] = useState('');
  const [draftGpaHigh, setDraftGpaHigh] = useState('');
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regenerateSubmitting, setRegenerateSubmitting] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateDraft, setRegenerateDraft] = useState<RegenerateFormDraft>(() => configToRegenerateDraft(null));

  // Deterministic palette for visually distinguishing cluster polygons.
  // (Only used when `properties.spray` is not set for a feature.)
  const clusterPalette = [
    '#ef4444', // red
    '#eab308', // amber
    '#22c55e', // green
  ];

  const getClusterColor = (cluster: number | null | undefined): string => {
    if (cluster == null || Number.isNaN(cluster)) return '#6b7280';
    // Default mapping: cluster 1=red, cluster 2=yellow, cluster 3=green.
    // For any other cluster numbers, cycle through the 3 colors.
    const idx = (Math.abs(Math.trunc(cluster)) - 1) % 3;
    return clusterPalette[idx] ?? '#6b7280';
  };

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
    setDetailConfig(null);
    setThresholdsModalOpen(false);
    setDetailLoading(true);
    try {
      const [geojson, status, cfg] = await Promise.all([
        apiService.getPrescription(taskId),
        apiService.getPrescriptionStatus(taskId),
        apiService.getPrescriptionConfig(taskId).catch(() => ({} as PrescriptionConfig)),
      ]);
      setDetailGeojson(geojson?.features ? geojson : null);
      setDetailStatus({ status: status.status, message: status.message });
      setDetailConfig(cfg);
      const initial: Record<string, SprayLevel> = {};
      if (geojson?.features) {
        for (const f of geojson.features) {
          const id =
            f.id != null
              ? String(f.id)
              : f.properties?.id != null
                ? String(f.properties.id)
                : f.properties?.cluster != null
                  ? String(f.properties.cluster)
                  : undefined;
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
    setDetailConfig(null);
    setThresholdsModalOpen(false);
    setRegenerateModalOpen(false);
    setRegenerateError(null);
  }, []);

  const getFeatureId = (feature: PrescriptionFeature): string | null => {
    if (feature.id != null) return String(feature.id);
    if (feature.properties?.id != null) return String(feature.properties.id);
    if (feature.properties?.cluster != null) return String(feature.properties.cluster);
    return null;
  };

  const getSprayForFeature = useCallback((feature: PrescriptionFeature): SprayLevel => {
    const id = getFeatureId(feature);
    if (id && sprayUpdates[id] !== undefined) return sprayUpdates[id];
    const p = feature.properties?.spray as string | undefined;
    if (p === 'none' || p === 'low' || p === 'high') return p as SprayLevel;
    return 'none';
  }, [sprayUpdates]);

  const getDisplayGpa = (f: PrescriptionFeature): string => {
    const spray = getSprayForFeature(f);
    const direct = f.properties?.spray_rate_gpa;
    if (direct != null && !Number.isNaN(Number(direct))) return Number(direct).toFixed(2);
    const c = detailConfig;
    if (c) {
      if (spray === 'none' && c.spray_rate_gpa_none != null) return c.spray_rate_gpa_none.toFixed(2);
      if (spray === 'low' && c.spray_rate_gpa_low != null) return c.spray_rate_gpa_low.toFixed(2);
      if (spray === 'high' && c.spray_rate_gpa_high != null) return c.spray_rate_gpa_high.toFixed(2);
    }
    return '—';
  };

  const setSprayForFeature = (featureId: string, level: SprayLevel) => {
    setSprayUpdates((prev) => ({ ...prev, [featureId]: level }));
  };

  const openThresholdsModal = useCallback(() => {
    const c = detailConfig ?? {};
    setDraftGpaNone(c.spray_rate_gpa_none != null ? String(c.spray_rate_gpa_none) : '');
    setDraftGpaLow(c.spray_rate_gpa_low != null ? String(c.spray_rate_gpa_low) : '');
    setDraftGpaHigh(c.spray_rate_gpa_high != null ? String(c.spray_rate_gpa_high) : '');
    setThresholdsModalOpen(true);
  }, [detailConfig]);

  const saveThresholds = useCallback(async () => {
    if (!selectedTaskId) return;
    setSavingThresholds(true);
    try {
      const current = await apiService.getPrescriptionConfig(selectedTaskId);
      const merged: PrescriptionConfig = { ...current };
      if (draftGpaNone.trim() !== '') merged.spray_rate_gpa_none = parseFloat(draftGpaNone);
      if (draftGpaLow.trim() !== '') merged.spray_rate_gpa_low = parseFloat(draftGpaLow);
      if (draftGpaHigh.trim() !== '') merged.spray_rate_gpa_high = parseFloat(draftGpaHigh);
      const saved = await apiService.setPrescriptionConfig(selectedTaskId, merged);
      setDetailConfig(saved);
      const geo = await apiService.getPrescription(selectedTaskId);
      setDetailGeojson(geo?.features ? geo : null);
      setThresholdsModalOpen(false);
    } catch (e) {
      console.error('Failed to save spray thresholds', e);
    } finally {
      setSavingThresholds(false);
    }
  }, [selectedTaskId, draftGpaNone, draftGpaLow, draftGpaHigh]);

  const totalGallons = useMemo(() => {
    if (!detailGeojson?.features?.length) return null;
    return computePrescriptionTotalGallons(detailGeojson, getSprayForFeature, detailConfig);
  }, [detailGeojson, getSprayForFeature, detailConfig]);

  const previewGallonsInModal = useMemo(() => {
    if (!detailGeojson?.features?.length) return null;
    const override: PrescriptionConfig = {
      ...(detailConfig ?? {}),
    };
    if (draftGpaNone.trim() !== '') override.spray_rate_gpa_none = parseFloat(draftGpaNone);
    if (draftGpaLow.trim() !== '') override.spray_rate_gpa_low = parseFloat(draftGpaLow);
    if (draftGpaHigh.trim() !== '') override.spray_rate_gpa_high = parseFloat(draftGpaHigh);
    return computePrescriptionTotalGallons(detailGeojson, getSprayForFeature, override);
  }, [detailGeojson, getSprayForFeature, detailConfig, draftGpaNone, draftGpaLow, draftGpaHigh]);

  const parsedDraftGpaNone = draftGpaNone.trim() === '' ? Number.NaN : Number.parseFloat(draftGpaNone);
  const parsedDraftGpaLow = draftGpaLow.trim() === '' ? Number.NaN : Number.parseFloat(draftGpaLow);
  const parsedDraftGpaHigh = draftGpaHigh.trim() === '' ? Number.NaN : Number.parseFloat(draftGpaHigh);
  const thresholdsAreValid =
    Number.isFinite(parsedDraftGpaNone) &&
    parsedDraftGpaNone >= 0 &&
    Number.isFinite(parsedDraftGpaLow) &&
    parsedDraftGpaLow >= 0 &&
    Number.isFinite(parsedDraftGpaHigh) &&
    parsedDraftGpaHigh >= 0;

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

  const openRegenerateModal = useCallback(async () => {
    if (!selectedTaskId) return;
    setRegenerateError(null);
    try {
      const cfg = await apiService.getPrescriptionConfig(selectedTaskId);
      setDetailConfig(cfg);
      setRegenerateDraft(configToRegenerateDraft(cfg));
    } catch {
      setRegenerateDraft(configToRegenerateDraft(detailConfig));
    }
    setRegenerateModalOpen(true);
  }, [selectedTaskId, detailConfig]);

  const submitRegenerate = useCallback(async () => {
    if (!selectedTaskId) return;
    setRegenerateSubmitting(true);
    setRegenerateError(null);
    try {
      const current = await apiService.getPrescriptionConfig(selectedTaskId);
      const merged = mergeDraftIntoConfig(current, regenerateDraft);
      const saved = await apiService.setPrescriptionConfig(selectedTaskId, merged);
      setDetailConfig(saved);
      await apiService.triggerPrescriptionGeneration(selectedTaskId);
      setDetailStatus({ status: 'processing', message: 'Regenerating prescription…' });
      setRegenerateModalOpen(false);
    } catch (e) {
      setRegenerateError(e instanceof Error ? e.message : 'Regeneration request failed');
    } finally {
      setRegenerateSubmitting(false);
    }
  }, [selectedTaskId, regenerateDraft]);

  useEffect(() => {
    if (!selectedTaskId) return;
    if (detailStatus?.status !== 'processing') return;

    const tick = async () => {
      try {
        const s = await apiService.getPrescriptionStatus(selectedTaskId);
        setDetailStatus({ status: s.status, message: s.message });
        if (s.status === 'completed') {
          try {
            const geo = await apiService.getPrescription(selectedTaskId);
            setDetailGeojson(geo?.features ? geo : null);
            const cfg = await apiService.getPrescriptionConfig(selectedTaskId);
            setDetailConfig(cfg);
            const initial: Record<string, SprayLevel> = {};
            if (geo?.features) {
              for (const f of geo.features) {
                const id =
                  f.id != null
                    ? String(f.id)
                    : f.properties?.id != null
                      ? String(f.properties.id)
                      : f.properties?.cluster != null
                        ? String(f.properties.cluster)
                        : undefined;
                const spray = f.properties?.spray;
                if (id && spray) initial[id] = spray;
              }
            }
            setSprayUpdates(initial);
          } catch {
            /* keep prior map until user refreshes */
          }
        }
      } catch {
        /* transient poll errors */
      }
    };

    void tick();
    const pollId = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(pollId);
  }, [selectedTaskId, detailStatus?.status]);

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
            <div className="p-6 border-b border-dark-700 flex justify-between items-center gap-4 flex-wrap">
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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void openRegenerateModal()}
                  disabled={detailLoading || detailStatus?.status === 'processing'}
                  className="px-3 py-2 text-sm bg-dark-600 text-dark-100 border border-dark-500 rounded-lg hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Regenerate prescription
                </button>
                <button type="button" onClick={closeDetail} className="text-dark-400 hover:text-dark-100 p-2" aria-label="Close">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {detailStatus?.status === 'processing' && (
              <div className="px-6 py-3 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-100 text-sm flex items-start gap-3">
                <div
                  className="mt-0.5 h-4 w-4 shrink-0 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"
                  aria-hidden
                />
                <p>
                  <span className="font-medium text-yellow-200">Regenerating…</span> The updated map will appear when the job finishes. You can close this dialog; reopen the task from the list to check status.
                </p>
              </div>
            )}
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
                            const f = feature as unknown as PrescriptionFeature;
                            const fid = getFeatureId(f);
                            const rawSpray = f.properties?.spray as SprayLevel | undefined;
                            const userSpray = fid && sprayUpdates[fid] !== undefined ? sprayUpdates[fid] : undefined;
                            const hasSpray = rawSpray != null || userSpray != null;

                            if (hasSpray) {
                              const spray = getSprayForFeature(f);
                              const fill =
                                spray === 'high'
                                  ? '#22c55e'
                                  : spray === 'low'
                                    ? '#eab308'
                                    : '#ef4444';
                              return { fillColor: fill, fillOpacity: 0.7, color: '#fff', weight: 1 };
                            }

                            const fill = getClusterColor(f.properties?.cluster);
                            return { fillColor: fill, fillOpacity: 0.7, color: '#fff', weight: 1 };
                          }}
                          onEachFeature={(feature, layer) => {
                            const f = feature as unknown as PrescriptionFeature;
                            const fid = getFeatureId(f);
                            const cluster = f.properties?.cluster;
                            const ndviMaxMean = f.properties?.NDVI_max_mean;
                            const rawSpray = f.properties?.spray as SprayLevel | undefined;
                            const userSpray = fid && sprayUpdates[fid] !== undefined ? sprayUpdates[fid] : undefined;
                            const hasSpray = rawSpray != null || userSpray != null;
                            const sprayText = hasSpray ? getSprayForFeature(f) : 'Not set';
                            const gpaText = hasSpray ? getDisplayGpa(f) : '—';

                            if (fid || cluster != null) {
                              layer.bindPopup(
                                `<div class="text-black">
                                  <strong>Cluster:</strong> ${cluster ?? fid}<br/>
                                  <strong>Max NDVI (mean):</strong> ${
                                    ndviMaxMean !== undefined && ndviMaxMean !== null ? ndviMaxMean.toFixed(3) : 'N/A'
                                  }<br/>
                                  <strong>Spray:</strong> ${sprayText}<br/>
                                  <strong>Rate (gal/ac):</strong> ${gpaText}
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
                      Set spray level per feature and click Save spray updates. Configure gallons-per-acre rates for each
                      level under Configure spray thresholds.
                    </p>
                    {totalGallons != null && (
                      <p className="text-dark-200 text-sm mb-3">
                        <span className="font-medium text-primary-400">Estimated total spray:</span>{' '}
                        {totalGallons.toFixed(1)} gal
                      </p>
                    )}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {detailGeojson.features.map((f, idx) => {
                        const fid = getFeatureId(f) ?? `feature-${idx}`;
                        const spray = getSprayForFeature(f);
                        const cluster = f.properties?.cluster;
                        const ndviMaxMean = f.properties?.NDVI_max_mean;
                        return (
                          <div key={fid} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-dark-700 rounded px-3 py-2">
                            <span className="text-dark-200 text-sm">
                              {cluster != null ? `Cluster ${cluster}` : fid}
                              {' '}
                              Max NDVI: {ndviMaxMean != null && ndviMaxMean !== undefined ? ndviMaxMean.toFixed(3) : 'N/A'}
                              <span className="text-dark-400"> · Rate: {getDisplayGpa(f)} gal/ac</span>
                            </span>
                            <select
                              value={spray}
                              onChange={(e) => setSprayForFeature(fid, e.target.value as SprayLevel)}
                              className="bg-dark-600 text-dark-100 border border-dark-500 rounded px-2 py-1 text-sm shrink-0"
                            >
                              <option value="none">None</option>
                              <option value="low">Low</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={openThresholdsModal}
                        className="px-4 py-2 bg-dark-600 text-dark-100 border border-dark-500 rounded-lg hover:bg-dark-500"
                      >
                        Configure spray thresholds
                      </button>
                      <button
                        type="button"
                        onClick={saveSprayUpdates}
                        disabled={savingSpray || Object.keys(sprayUpdates).length === 0}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingSpray ? 'Saving…' : 'Save spray updates'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-dark-400">No GeoJSON features to display.</p>
              )}
            </div>

            {regenerateModalOpen && (
              <div
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
                onClick={() => setRegenerateModalOpen(false)}
                role="presentation"
              >
                <div
                  className="bg-dark-800 rounded-lg border border-dark-600 max-w-2xl w-full p-6 shadow-xl my-8"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-labelledby="regenerate-rx-title"
                >
                  <h4 id="regenerate-rx-title" className="text-lg font-semibold text-primary-400 mb-2">
                    Regenerate prescription
                  </h4>
                  <p className="text-dark-400 text-sm mb-4">
                    These values are merged with global defaults for this task. Empty fields keep the current saved value.
                    After you confirm, the server starts generation in the background; this dialog can close while the job runs.
                  </p>
                  {regenerateError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                      {regenerateError}
                    </div>
                  )}
                  <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                    <div>
                      <h5 className="text-sm font-semibold text-primary-400 mb-2">Prescription module (R)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm text-dark-300">
                          Heading (°)
                          <input
                            type="text"
                            inputMode="decimal"
                            value={regenerateDraft.heading}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, heading: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                            placeholder="Leave blank to keep current"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          Cell size (m), empty = automatic
                          <input
                            type="text"
                            inputMode="decimal"
                            value={regenerateDraft.cell_size}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, cell_size: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                            placeholder="Automatic"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          Cluster count
                          <input
                            type="text"
                            inputMode="numeric"
                            value={regenerateDraft.cluster_count}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, cluster_count: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          Smoothing rounds
                          <input
                            type="text"
                            inputMode="numeric"
                            value={regenerateDraft.smoothing_rounds}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, smoothing_rounds: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          Smoothing sigma
                          <input
                            type="text"
                            inputMode="numeric"
                            value={regenerateDraft.smoothing_sigma}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, smoothing_sigma: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          Maximum vertices
                          <input
                            type="text"
                            inputMode="numeric"
                            value={regenerateDraft.maximum_vertices}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, maximum_vertices: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                        <label className="text-sm text-dark-300 md:col-span-2">
                          NDVI threshold (healthy classification, −1–1)
                          <input
                            type="text"
                            inputMode="decimal"
                            value={regenerateDraft.ndvi_threshold}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, ndvi_threshold: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-primary-400 mb-2">Spray rate thresholds (gal/ac)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-sm text-dark-300">
                          None
                          <input
                            type="text"
                            inputMode="decimal"
                            value={regenerateDraft.spray_rate_gpa_none}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, spray_rate_gpa_none: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          Low
                          <input
                            type="text"
                            inputMode="decimal"
                            value={regenerateDraft.spray_rate_gpa_low}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, spray_rate_gpa_low: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                        <label className="text-sm text-dark-300">
                          High
                          <input
                            type="text"
                            inputMode="decimal"
                            value={regenerateDraft.spray_rate_gpa_high}
                            onChange={(e) =>
                              setRegenerateDraft((p) => ({ ...p, spray_rate_gpa_high: e.target.value }))
                            }
                            className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2 justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRegenerateModalOpen(false)}
                      className="px-4 py-2 bg-dark-600 text-dark-100 border border-dark-500 rounded-lg hover:bg-dark-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitRegenerate()}
                      disabled={regenerateSubmitting}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {regenerateSubmitting ? 'Saving & starting…' : 'Save settings & regenerate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {thresholdsModalOpen && (
              <div
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
                onClick={() => setThresholdsModalOpen(false)}
                role="presentation"
              >
                <div
                  className="bg-dark-800 rounded-lg border border-dark-600 max-w-md w-full p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-labelledby="spray-thresholds-title"
                >
                  <h4 id="spray-thresholds-title" className="text-lg font-semibold text-primary-400 mb-2">
                    Spray thresholds (gal/ac)
                  </h4>
                  <p className="text-dark-400 text-sm mb-4">
                    Gallons per acre for each spray level. These are stored in the field config and applied to each cluster
                    as <span className="text-dark-200">spray_rate_gpa</span> when you save.
                  </p>
                  <div className="space-y-3">
                    <label className="block text-sm text-dark-200">
                      None
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={draftGpaNone}
                        onChange={(e) => setDraftGpaNone(e.target.value)}
                        className="mt-1 w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-dark-100"
                        placeholder="e.g. 0"
                      />
                    </label>
                    <label className="block text-sm text-dark-200">
                      Low
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={draftGpaLow}
                        onChange={(e) => setDraftGpaLow(e.target.value)}
                        className="mt-1 w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-dark-100"
                        placeholder="e.g. 5"
                      />
                    </label>
                    <label className="block text-sm text-dark-200">
                      High
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={draftGpaHigh}
                        onChange={(e) => setDraftGpaHigh(e.target.value)}
                        className="mt-1 w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-dark-100"
                        placeholder="e.g. 12"
                      />
                    </label>
                  </div>
                  {!thresholdsAreValid && (
                    <p className="mt-3 text-sm text-red-400">All spray thresholds must be numeric values greater than or equal to 0.</p>
                  )}
                  {previewGallonsInModal != null && (
                    <p className="text-dark-200 text-sm mt-4">
                      <span className="font-medium text-primary-400">Preview total spray:</span>{' '}
                      {previewGallonsInModal.toFixed(1)} gal (uses draft rates above with current cluster areas)
                    </p>
                  )}
                  <div className="mt-6 flex gap-2 justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => setThresholdsModalOpen(false)}
                      className="px-4 py-2 bg-dark-600 text-dark-100 border border-dark-500 rounded-lg hover:bg-dark-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveThresholds}
                      disabled={savingThresholds || !thresholdsAreValid}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {savingThresholds ? 'Saving…' : 'Save thresholds'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PesticidePrescriptionsView;
