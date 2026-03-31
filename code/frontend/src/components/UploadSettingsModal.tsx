import React, { useEffect, useState } from 'react';
import { UploadSystemSettings, UploadSystemSettingsUpdate } from '../types/upload';

interface UploadSettingsModalProps {
  isOpen: boolean;
  settings: UploadSystemSettings | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: UploadSystemSettingsUpdate) => Promise<void>;
  onReset: () => Promise<void>;
}

const UploadSettingsModal: React.FC<UploadSettingsModalProps> = ({
  isOpen,
  settings,
  isSaving,
  error,
  onClose,
  onSave,
  onReset,
}) => {
  const [local, setLocal] = useState<UploadSystemSettings | null>(null);

  useEffect(() => {
    if (isOpen && settings) {
      setLocal(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen || !local) return null;

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
                  value={local.robot_width}
                  onChange={(e) => setLocal({ ...local, robot_width: parseFloat(e.target.value) || 0.1 })}
                />
              </label>
              <label className="text-sm text-dark-300">
                Boom/Swath width (m)
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={local.coverage_width}
                  onChange={(e) => setLocal({ ...local, coverage_width: parseFloat(e.target.value) || 0.1 })}
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-dark-600 bg-dark-700 p-4">
            <h4 className="mb-3 text-sm font-semibold text-primary-400">NodeODM Processing</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-dark-300">
                Radiometric calibration
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.radiometric_calibration}
                  onChange={(e) => updateNodeOdm('radiometric_calibration', e.target.value)}
                />
              </label>
              <label className="text-sm text-dark-300">
                Feature quality
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.feature_quality}
                  onChange={(e) => updateNodeOdm('feature_quality', e.target.value)}
                />
              </label>
              <label className="text-sm text-dark-300">
                Matcher type
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.matcher_type}
                  onChange={(e) => updateNodeOdm('matcher_type', e.target.value)}
                />
              </label>
              <label className="text-sm text-dark-300">
                Min features
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="1"
                  step="1"
                  value={local.nodeodm.min_num_features}
                  onChange={(e) => updateNodeOdm('min_num_features', parseInt(e.target.value, 10) || 1)}
                />
              </label>
              <label className="text-sm text-dark-300">
                Orthophoto resolution
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={local.nodeodm.orthophoto_resolution}
                  onChange={(e) => updateNodeOdm('orthophoto_resolution', parseFloat(e.target.value) || 0.1)}
                />
              </label>
              <label className="text-sm text-dark-300">
                Point cloud quality
                <input
                  className="mt-1 w-full rounded border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100"
                  value={local.nodeodm.pc_quality}
                  onChange={(e) => updateNodeOdm('pc_quality', e.target.value)}
                />
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
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600 disabled:opacity-50"
            disabled={isSaving}
            onClick={() =>
              onSave({
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
              })
            }
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            className="rounded bg-dark-600 px-4 py-2 text-sm text-dark-100 hover:bg-dark-500 disabled:opacity-50"
            disabled={isSaving}
            onClick={onReset}
          >
            Reset NodeODM Settings To Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSettingsModal;
