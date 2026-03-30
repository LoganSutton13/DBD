/**
 * Prescription API types. Aligned with backend schemas in app/schemas/prescription.py
 * and app/schemas/prescription_config.py.
 */

export type PrescriptionStatus = 'not_started' | 'processing' | 'completed' | 'failed';

export type SprayLevel = 'none' | 'low' | 'high';

/** Item in GET /api/v1/prescription/ list response. */
export interface PrescriptionListItem {
  taskId: string;
  taskName?: string;
  prescriptionUrl?: string;
}

/** Response for GET /api/v1/prescription/ */
export interface PrescriptionListResponse {
  items: PrescriptionListItem[];
}

/** Response for GET /api/v1/prescription/{taskId}/status */
export interface PrescriptionStatusResponse {
  taskId: string;
  status: PrescriptionStatus;
  message?: string;
}

/** Single spray assignment for PUT /api/v1/prescription/{taskId} */
export interface PrescriptionUpdateItem {
  featureId: string;
  spray: SprayLevel;
}

/** Request body for PUT /api/v1/prescription/{taskId} */
export interface PrescriptionUpdateRequest {
  updates: PrescriptionUpdateItem[];
}

/** Per-task config for PUT /api/v1/prescription/{taskId}/config */
export interface PrescriptionConfig {
  heading?: number;
  cell_size?: number;
  cluster_count?: number;
  smoothing_rounds?: number;
  smoothing_sigma?: number;
  maximum_vertices?: number;
  ndvi_threshold?: number;
}

/** Properties on prescription GeoJSON features (R module output). */
export interface PrescriptionFeatureProperties {
  id?: string | number;
  PlotID?: number;
  cluster?: number;
  NDVI_max?: number;
  NDVI_mean?: number;
  NDVI_max_mean?: number;
  NDVI_max_max?: number;
  spray?: SprayLevel;
  [key: string]: unknown;
}

/** Single feature in prescription GeoJSON. */
export interface PrescriptionFeature {
  type: 'Feature';
  id?: string | number;
  properties?: PrescriptionFeatureProperties;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

/** Prescription map GeoJSON (GET/PUT /api/v1/prescription/{taskId}). */
export interface PrescriptionGeoJSON {
  type: 'FeatureCollection';
  features: PrescriptionFeature[];
}
