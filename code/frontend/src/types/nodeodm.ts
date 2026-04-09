// Recommended settings from NodeODM documentation:
// These produce optimal NDVI results (aligned with backend DEFAULT_UPLOAD_SETTINGS.nodeodm).

export const NODEODM_RADIOMETRIC_CALIBRATION_VALUES = ['camera', 'none', 'camera+sun'] as const;
export type NodeODMRadiometricCalibration = (typeof NODEODM_RADIOMETRIC_CALIBRATION_VALUES)[number];

export const NODEODM_FEATURE_QUALITY_VALUES = ['high', 'medium', 'low', 'ultra', 'lowest'] as const;
export type NodeODMFeatureQuality = (typeof NODEODM_FEATURE_QUALITY_VALUES)[number];

export const NODEODM_MATCHER_TYPE_VALUES = ['flann', 'bow', 'bruteforce'] as const;
export type NodeODMMatcherType = (typeof NODEODM_MATCHER_TYPE_VALUES)[number];

export const NODEODM_PC_QUALITY_VALUES = ['high', 'medium', 'low', 'ultra', 'lowest'] as const;
export type NodeODMPcQuality = (typeof NODEODM_PC_QUALITY_VALUES)[number];

export interface NodeODMOptions {
  radiometric_calibration: NodeODMRadiometricCalibration;
  feature_quality: NodeODMFeatureQuality;
  matcher_type: NodeODMMatcherType;
  min_num_features: number;
  ignore_gsd: boolean;
  skip_3dmodel: boolean;
  orthophoto_resolution: number; // > 0 (float), matches backend Pydantic gt=0
  orthophoto_no_tiled: boolean;
  texturing_skip_global_seam_leveling: boolean;
  pc_quality: NodeODMPcQuality;
  orthophoto_png: boolean;
}

export const DEFAULT_NODEODM_OPTIONS: NodeODMOptions = {
  radiometric_calibration: 'camera',
  feature_quality: 'high',
  matcher_type: 'flann',
  min_num_features: 8000,
  ignore_gsd: true,
  skip_3dmodel: true,
  orthophoto_resolution: 5.0,
  orthophoto_no_tiled: false,
  texturing_skip_global_seam_leveling: true,
  pc_quality: 'high',
  orthophoto_png: true,
};

function pickLiteral<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val) ? (val as T) : fallback;
}

function pickBool(val: unknown, fallback: boolean): boolean {
  return typeof val === 'boolean' ? val : fallback;
}

function pickPositiveNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val;
  return fallback;
}

function pickMinFeatures(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const n = Math.floor(val);
    if (n >= 1) return n;
  }
  return fallback;
}

/** Coerce API/persisted data to valid NodeODM options; invalid fields use defaults. */
export function normalizeNodeOdmOptions(raw: unknown): NodeODMOptions {
  const d = DEFAULT_NODEODM_OPTIONS;
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    radiometric_calibration: pickLiteral(o.radiometric_calibration, NODEODM_RADIOMETRIC_CALIBRATION_VALUES, d.radiometric_calibration),
    feature_quality: pickLiteral(o.feature_quality, NODEODM_FEATURE_QUALITY_VALUES, d.feature_quality),
    matcher_type: pickLiteral(o.matcher_type, NODEODM_MATCHER_TYPE_VALUES, d.matcher_type),
    min_num_features: pickMinFeatures(o.min_num_features, d.min_num_features),
    ignore_gsd: pickBool(o.ignore_gsd, d.ignore_gsd),
    skip_3dmodel: pickBool(o.skip_3dmodel, d.skip_3dmodel),
    orthophoto_resolution: pickPositiveNumber(o.orthophoto_resolution, d.orthophoto_resolution),
    orthophoto_no_tiled: pickBool(o.orthophoto_no_tiled, d.orthophoto_no_tiled),
    texturing_skip_global_seam_leveling: pickBool(
      o.texturing_skip_global_seam_leveling,
      d.texturing_skip_global_seam_leveling
    ),
    pc_quality: pickLiteral(o.pc_quality, NODEODM_PC_QUALITY_VALUES, d.pc_quality),
    orthophoto_png: true,
  };
}
