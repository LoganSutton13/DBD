export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  metadata?: {
    size: number;
    type: string;
    lastModified: number;
    name: string;
  };
}

export interface UploadSettings {
  maxFileSize: number; // in MB
  allowedTypes: string[];
  maxFiles: number;
}

// Chunked upload types
export interface UploadInitResponse {
  task_id: string;
}

export interface ChunkedFileInfo {
  filename: string;
  total_chunks: number;
  size: number;
}

// Backend API response types
export interface UploadResponse {
  message: string;
  task_id: string;
  nodeodm_task_id: string;
  file_count: number;
  status: string;
  files: string[];
  created_at: string;
  task_name?: string;
}

export interface TaskStatusResponse {
  status: string;
  progress: string;
}

export interface ProcessingTask {
  id: string;
  nodeodm_task_id: string;
  status: string;
  progress: number;
  file_count: number;
  files: string[];
  created_at: string;
  error?: string;
  task_name?: string;
}

export interface NodeOdmSettings {
  radiometric_calibration: string;
  feature_quality: string;
  matcher_type: string;
  min_num_features: number;
  ignore_gsd: boolean;
  skip_3dmodel: boolean;
  orthophoto_resolution: number;
  orthophoto_no_tiled: boolean;
  texturing_skip_global_seam_leveling: boolean;
  pc_quality: string;
  orthophoto_png: boolean;
}

/** Global defaults for the R prescription module (aligned with prescription_module.R). Heading is per-task only. */
export interface PrescriptionModuleSettings {
  cell_size: number | null;
  cluster_count: number;
  smoothing_rounds: number;
  smoothing_sigma: number;
  maximum_vertices: number;
  ndvi_threshold: number;
}

/** Defaults when API omits `prescription` (older clients) or fields are partial. */
export const DEFAULT_PRESCRIPTION_MODULE: PrescriptionModuleSettings = {
  cell_size: null,
  cluster_count: 3,
  smoothing_rounds: 3,
  smoothing_sigma: 10,
  maximum_vertices: 80000,
  ndvi_threshold: 1,
};

export interface UploadSystemSettings {
  robot_width: number;
  coverage_width: number;
  nodeodm: NodeOdmSettings;
  prescription: PrescriptionModuleSettings;
}

export interface UploadSystemSettingsUpdate {
  robot_width?: number;
  coverage_width?: number;
  nodeodm?: Partial<Omit<NodeOdmSettings, 'orthophoto_png'>>;
  prescription?: Partial<PrescriptionModuleSettings>;
}
