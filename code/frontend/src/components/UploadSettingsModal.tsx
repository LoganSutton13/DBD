import React, { useEffect, useState } from 'react';
import {
  DEFAULT_NODEODM_OPTIONS,
  NODEODM_FEATURE_QUALITY_VALUES,
  NODEODM_MATCHER_TYPE_VALUES,
  NODEODM_PC_QUALITY_VALUES,
  NODEODM_RADIOMETRIC_CALIBRATION_VALUES,
} from '../types/nodeodm';
import {
  DEFAULT_PRESCRIPTION_MODULE,
  UploadSystemSettings,
  UploadSystemSettingsUpdate,
} from '../types/upload';

interface UploadSettingsModalProps {
  isOpen: boolean;
  settings: UploadSystemSettings | null;
  rtkBase: { longitude: number; latitude: number } | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (
    payload: UploadSystemSettingsUpdate,
    rtkBase: { longitude: number; latitude: number }
  ) => Promise<void>;
  onReset: () => Promise<void>;
  onResetNodeOdm: () => Promise<void>;
  onResetPrescription: () => Promise<void>;
}

const UploadSettingsModal: React.FC<UploadSettingsModalProps> = ({
  isOpen,
  settings,
  rtkBase,
  isSaving,
  error,
  onClose,
  onSave,
  onReset,
  onResetNodeOdm,
  onResetPrescription,
}) => {
  const [local, setLocal] = useState<UploadSystemSettings | null>(null);
  const [localRtkBase, setLocalRtkBase] = useState<{ longitude: number; latitude: number }>({
    longitude: 0,
    latitude: 0,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const setDraft = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const parseFloatDraft = (key: string): number | null => {
    const raw = drafts[key];
    if (raw == null || raw.trim() === '') return null;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseIntDraft = (key: string): number | null => {
    const raw = drafts[key];
    if (raw == null || raw.trim() === '') return null;
    if (!/^-?\d+$/.test(raw.trim())) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  useEffect(() => {
    if (isOpen && settings) {
      const nextLocal = {
        ...settings,
        prescription: {
          ...DEFAULT_PRESCRIPTION_MODULE,
          ...(settings.prescription ?? {}),
        },
      };
      setLocal(nextLocal);
      setDrafts({
        robot_width: String(nextLocal.robot_width),
        coverage_width: String(nextLocal.coverage_width),
        nodeodm_min_num_features: String(nextLocal.nodeodm.min_num_features),
        nodeodm_orthophoto_resolution: String(nextLocal.nodeodm.orthophoto_resolution),
        prescription_cluster_count: String(nextLocal.prescription.cluster_count),
        prescription_smoothing_rounds: String(nextLocal.prescription.smoothing_rounds),
        prescription_smoothing_sigma: String(nextLocal.prescription.smoothing_sigma),
        prescription_maximum_vertices: String(nextLocal.prescription.maximum_vertices),
        prescription_ndvi_threshold: String(nextLocal.prescription.ndvi_threshold),
      });
    }
    if (isOpen && rtkBase) {
      setLocalRtkBase(rtkBase);
      setDrafts((prev) => ({
        ...prev,
        rtk_longitude: String(rtkBase.longitude),
        rtk_latitude: String(rtkBase.latitude),
      }));
    }
  }, [isOpen, settings, rtkBase]);

  if (!isOpen || !local) return null;

  const validationErrors: string[] = [];

  const robotWidth = parseFloatDraft('robot_width');
  if (robotWidth == null || robotWidth < 0.1) {
    validationErrors.push('Robot width must be at least 0.1 m.');
  }

  const coverageWidth = parseFloatDraft('coverage_width');
  if (coverageWidth == null || coverageWidth < 0.1) {
    validationErrors.push('Boom/Swath width must be at least 0.1 m.');
  }

  const minFeatures = parseIntDraft('nodeodm_min_num_features');
  if (minFeatures == null || minFeatures < 1) {
    validationErrors.push('Min features must be an integer of at least 1.');
  }

  const orthophotoResolution = parseFloatDraft('nodeodm_orthophoto_resolution');
  if (orthophotoResolution == null || orthophotoResolution <= 0) {
    validationErrors.push('Orthophoto resolution must be greater than 0.');
  }

  const clusterCount = parseIntDraft('prescription_cluster_count');
  if (clusterCount == null || clusterCount < 1) {
    validationErrors.push('Cluster count must be an integer of at least 1.');
  }

  const smoothingRounds = parseIntDraft('prescription_smoothing_rounds');
  if (smoothingRounds == null || smoothingRounds < 0) {
    validationErrors.push('Smoothing rounds must be an integer of at least 0.');
  }

  const smoothingSigma = parseIntDraft('prescription_smoothing_sigma');
  if (smoothingSigma == null || smoothingSigma < 1) {
    validationErrors.push('Smoothing sigma must be an integer of at least 1.');
  }

  const maximumVertices = parseIntDraft('prescription_maximum_vertices');
  if (maximumVertices == null || maximumVertices < 1) {
    validationErrors.push('Maximum vertices must be an integer of at least 1.');
  }

  const ndviThreshold = parseFloatDraft('prescription_ndvi_threshold');
  if (ndviThreshold == null || ndviThreshold < -1 || ndviThreshold > 1) {
    validationErrors.push('NDVI threshold must be between -1 and 1.');
  }

  const longitude = parseFloatDraft('rtk_longitude');
  if (longitude == null || longitude < -180 || longitude > 180) {
    validationErrors.push('Longitude must be between -180 and 180.');
  }

  const latitude = parseFloatDraft('rtk_latitude');
  if (latitude == null || latitude < -90 || latitude > 90) {
    validationErrors.push('Latitude must be between -90 and 90.');
  }

  const isFormValid = validationErrors.length === 0;

  const updateNodeOdm = <K extends keyof UploadSystemSettings['nodeodm']>(
    key: K,
    value: UploadSystemSettings['nodeodm'][K]
  ) => {
    setLocal((prev) =>
      prev
        ? {
            ...prev,
            nodeodm: {
              ...prev.nodeodm,
              [key]: value,
            },
          }
        : prev
    );
  };

  const updatePrescription = <K extends keyof UploadSystemSettings['prescription']>(
    key: K,
    value: UploadSystemSettings['prescription'][K]
  ) => {
    setLocal((prev) =>
      prev
        ? {
            ...prev,
            prescription: {
              ...prev.prescription,
              [key]: value,
            },
          }
        : prev
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-dark-600 bg-dark-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-primary-400">Upload Settings</h3>
          <button className="text-dark-300 hover:text-dark-100" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="mb-4 text-sm text-dark-300">
          We strongly recommend using the defaults unless you have a specific agronomy or processing reason to change them.
        </p>

        <div className="space-y-4">
          <section className="rounded-lg border border-dark-600 bg-dark-700 p-4">
            <h4 className="mb-3 text-sm font-semibold text-primary-400">Robot Defaults</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-dark-300">
                Robot width (m)
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={drafts.robot_width ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('robot_width', value);
                    const parsed = Number.parseFloat(value);
                    if (Number.isFinite(parsed)) {
                      setLocal((prev) => (prev ? { ...prev, robot_width: parsed } : prev));
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Boom/Swath width (m)
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={drafts.coverage_width ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('coverage_width', value);
                    const parsed = Number.parseFloat(value);
                    if (Number.isFinite(parsed)) {
                      setLocal((prev) => (prev ? { ...prev, coverage_width: parsed } : prev));
                    }
                  }}
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-dark-600 bg-dark-700 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-primary-400">NodeODM Processing</h4>
              <button
                type="button"
                className="rounded bg-dark-600 px-3 py-1.5 text-xs text-dark-100 hover:bg-dark-500 disabled:opacity-50"
                disabled={isSaving}
                onClick={() => onResetNodeOdm()}
              >
                Reset NodeODM defaults
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-dark-300">
                Radiometric calibration
                <select
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.radiometric_calibration}
                  onChange={(e) =>
                    updateNodeOdm(
                      'radiometric_calibration',
                      e.target.value as (typeof NODEODM_RADIOMETRIC_CALIBRATION_VALUES)[number]
                    )
                  }
                >
                  {NODEODM_RADIOMETRIC_CALIBRATION_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {v === DEFAULT_NODEODM_OPTIONS.radiometric_calibration ? ' (Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-dark-300">
                Feature quality
                <select
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.feature_quality}
                  onChange={(e) =>
                    updateNodeOdm('feature_quality', e.target.value as (typeof NODEODM_FEATURE_QUALITY_VALUES)[number])
                  }
                >
                  {NODEODM_FEATURE_QUALITY_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {v === DEFAULT_NODEODM_OPTIONS.feature_quality ? ' (Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-dark-300">
                Matcher type
                <select
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.matcher_type}
                  onChange={(e) =>
                    updateNodeOdm('matcher_type', e.target.value as (typeof NODEODM_MATCHER_TYPE_VALUES)[number])
                  }
                >
                  {NODEODM_MATCHER_TYPE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {v === DEFAULT_NODEODM_OPTIONS.matcher_type ? ' (Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-dark-300">
                Min features
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min={1}
                  step={1}
                  value={drafts.nodeodm_min_num_features ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('nodeodm_min_num_features', value);
                    if (/^-?\d+$/.test(value.trim())) {
                      const parsed = Number.parseInt(value, 10);
                      if (Number.isFinite(parsed)) {
                        updateNodeOdm('min_num_features', parsed);
                      }
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Orthophoto resolution
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={drafts.nodeodm_orthophoto_resolution ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('nodeodm_orthophoto_resolution', value);
                    const parsed = Number.parseFloat(value);
                    if (Number.isFinite(parsed)) {
                      updateNodeOdm('orthophoto_resolution', parsed);
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Point cloud quality
                <select
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.pc_quality}
                  onChange={(e) =>
                    updateNodeOdm('pc_quality', e.target.value as (typeof NODEODM_PC_QUALITY_VALUES)[number])
                  }
                >
                  {NODEODM_PC_QUALITY_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {v === DEFAULT_NODEODM_OPTIONS.pc_quality ? ' (Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-dark-300 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={local.nodeodm.ignore_gsd}
                  onChange={(e) => updateNodeOdm('ignore_gsd', e.target.checked)}
                />
                Ignore GSD
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={local.nodeodm.skip_3dmodel}
                  onChange={(e) => updateNodeOdm('skip_3dmodel', e.target.checked)}
                />
                Skip 3D model
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={local.nodeodm.orthophoto_no_tiled}
                  onChange={(e) => updateNodeOdm('orthophoto_no_tiled', e.target.checked)}
                />
                Orthophoto no tiled
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={local.nodeodm.texturing_skip_global_seam_leveling}
                  onChange={(e) => updateNodeOdm('texturing_skip_global_seam_leveling', e.target.checked)}
                />
                Skip global seam leveling
              </label>
              <label className="flex items-center gap-2 text-dark-400">
                <input type="checkbox" checked={true} disabled />
                Orthophoto PNG (required)
              </label>
            </div>
          </section>
          <section className="rounded-lg border border-dark-600 bg-dark-700 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-primary-400">Prescription module</h4>
              <button
                type="button"
                className="rounded bg-dark-600 px-3 py-1.5 text-xs text-dark-100 hover:bg-dark-500 disabled:opacity-50"
                disabled={isSaving}
                onClick={() => onResetPrescription()}
              >
                Reset prescription defaults
              </button>
            </div>
            <p className="mb-3 text-xs text-dark-400">
              Defaults match the R script. Per-field overrides may still apply when set for a task. Output paths are always set by the system.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-dark-300">
                Cell size (m), empty = automatic
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="text"
                  inputMode="decimal"
                  placeholder="Automatic"
                  value={local.prescription.cell_size == null ? '' : String(local.prescription.cell_size)}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === '') updatePrescription('cell_size', null);
                    else {
                      const n = parseFloat(v);
                      if (!Number.isNaN(n)) updatePrescription('cell_size', n);
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Cluster count
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="1"
                  step="1"
                  value={drafts.prescription_cluster_count ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('prescription_cluster_count', value);
                    if (/^-?\d+$/.test(value.trim())) {
                      const parsed = Number.parseInt(value, 10);
                      if (Number.isFinite(parsed)) {
                        updatePrescription('cluster_count', parsed);
                      }
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Smoothing rounds
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="0"
                  step="1"
                  value={drafts.prescription_smoothing_rounds ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('prescription_smoothing_rounds', value);
                    if (/^-?\d+$/.test(value.trim())) {
                      const parsed = Number.parseInt(value, 10);
                      if (Number.isFinite(parsed)) {
                        updatePrescription('smoothing_rounds', parsed);
                      }
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Smoothing sigma
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="1"
                  step="1"
                  value={drafts.prescription_smoothing_sigma ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('prescription_smoothing_sigma', value);
                    if (/^-?\d+$/.test(value.trim())) {
                      const parsed = Number.parseInt(value, 10);
                      if (Number.isFinite(parsed)) {
                        updatePrescription('smoothing_sigma', parsed);
                      }
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                Maximum vertices
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="1"
                  step="1"
                  value={drafts.prescription_maximum_vertices ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('prescription_maximum_vertices', value);
                    if (/^-?\d+$/.test(value.trim())) {
                      const parsed = Number.parseInt(value, 10);
                      if (Number.isFinite(parsed)) {
                        updatePrescription('maximum_vertices', parsed);
                      }
                    }
                  }}
                />
              </label>
              <label className="text-sm text-dark-300">
                NDVI threshold (healthy classification)
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min={-1}
                  max={1}
                  step="0.01"
                  value={drafts.prescription_ndvi_threshold ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setDraft('prescription_ndvi_threshold', value);
                    const parsed = Number.parseFloat(value);
                    if (Number.isFinite(parsed)) {
                      updatePrescription('ndvi_threshold', parsed);
                    }
                  }}
                />
              </label>
            </div>
          </section>


          <section className="rounded-lg border border-dark-600 bg-dark-700 p-4">
            <h4 className="mb-3 text-sm font-semibold text-primary-400">RTK Base Station</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-dark-300">
                Longitude
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={drafts.rtk_longitude ?? ''}
                  onChange={(e) =>
                    {
                      const { value } = e.target;
                      setDraft('rtk_longitude', value);
                      const parsed = Number.parseFloat(value);
                      if (Number.isFinite(parsed)) {
                        setLocalRtkBase((prev) => ({
                          ...prev,
                          longitude: parsed,
                        }));
                      }
                    }
                  }
                />
              </label>
              <label className="text-sm text-dark-300">
                Latitude
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={drafts.rtk_latitude ?? ''}
                  onChange={(e) =>
                    {
                      const { value } = e.target;
                      setDraft('rtk_latitude', value);
                      const parsed = Number.parseFloat(value);
                      if (Number.isFinite(parsed)) {
                        setLocalRtkBase((prev) => ({
                          ...prev,
                          latitude: parsed,
                        }));
                      }
                    }
                  }
                />
              </label>
            </div>
          </section>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        {!isFormValid ? (
          <p className="mt-2 text-sm text-red-400">{validationErrors[0]}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600 disabled:opacity-50"
            disabled={isSaving || !isFormValid}
            onClick={() =>
              onSave(
                {
                  robot_width: local.robot_width,
                  coverage_width: local.coverage_width,
                  nodeodm: {
                    radiometric_calibration: local.nodeodm.radiometric_calibration,
                    feature_quality: local.nodeodm.feature_quality,
                    matcher_type: local.nodeodm.matcher_type,
                    min_num_features: local.nodeodm.min_num_features,
                    ignore_gsd: local.nodeodm.ignore_gsd,
                    skip_3dmodel: local.nodeodm.skip_3dmodel,
                    orthophoto_resolution: local.nodeodm.orthophoto_resolution,
                    orthophoto_no_tiled: local.nodeodm.orthophoto_no_tiled,
                    texturing_skip_global_seam_leveling: local.nodeodm.texturing_skip_global_seam_leveling,
                    pc_quality: local.nodeodm.pc_quality,
                  },
                  prescription: {
                    cell_size: local.prescription.cell_size,
                    cluster_count: local.prescription.cluster_count,
                    smoothing_rounds: local.prescription.smoothing_rounds,
                    smoothing_sigma: local.prescription.smoothing_sigma,
                    maximum_vertices: local.prescription.maximum_vertices,
                    ndvi_threshold: local.prescription.ndvi_threshold,
                  },
                },
                localRtkBase
              )
            }
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            className="rounded bg-dark-600 px-4 py-2 text-sm text-dark-100 hover:bg-dark-500 disabled:opacity-50"
            disabled={isSaving}
            onClick={onReset}
          >
            Reset all settings to defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSettingsModal;
