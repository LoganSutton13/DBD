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