/**
 * API service for backend communication
 */

import {
  UploadResponse,
  UploadInitResponse,
  ChunkedFileInfo,
  TaskStatusResponse,
  UploadSystemSettings,
  UploadSystemSettingsUpdate,
} from '../types/upload';
import {
  DisplayPathResponse,
  PrescriptionListResponse,
  PrescriptionStatusResponse,
  PrescriptionGeoJSON,
  PrescriptionUpdateRequest,
  PrescriptionConfig,
  PrescriptionGenerateResponse,
  RobotPathRawResponse,
} from '../types/prescription';

/** Response from DELETE /api/v1/results/{taskId} (matches backend DeleteTaskResultsResponse). */
export interface DeleteTaskResultsResponse {
  message: string;
  taskId: string;
  deleted: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  buildUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    return `${this.baseUrl}${pathOrUrl}`;
  }

  /** Default chunk size for chunked uploads (5MB). */
  static readonly CHUNK_SIZE = 5 * 1024 * 1024;

  /**
   * Initialize a chunked upload. Returns task_id for subsequent chunk and finalize calls.
   */
  async uploadInit(
    taskName?: string,
    heading?: number,
    gridSize?: number
  ): Promise<UploadInitResponse> {
    const formData = new FormData();
    if (taskName) formData.append('task_name', taskName);
    if (heading !== undefined) formData.append('heading', heading.toString());
    if (gridSize !== undefined) formData.append('grid_size', gridSize.toString());

    const response = await fetch(`${this.baseUrl}/api/v1/upload/init`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload init failed: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  /**
   * Upload a single chunk. Use onProgress for progress reporting (XHR-based).
   */
  async uploadChunk(
    taskId: string,
    filename: string,
    chunkIndex: number,
    totalChunks: number,
    chunkBlob: Blob,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ received: number }> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('filename', filename);
    formData.append('chunk_index', chunkIndex.toString());
    formData.append('total_chunks', totalChunks.toString());
    formData.append('chunk', chunkBlob);

    if (onProgress === undefined) {
      const response = await fetch(`${this.baseUrl}/api/v1/upload/chunk`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chunk upload failed: ${response.status} ${errorText}`);
      }
      return response.json();
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/api/v1/upload/chunk`);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid chunk response'));
          }
        } else {
          reject(new Error(`Chunk upload failed: ${xhr.status} ${xhr.responseText}`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Chunk upload network error')));
      xhr.addEventListener('abort', () => reject(new Error('Chunk upload aborted')));

      xhr.send(formData);
    });
  }

  /**
   * Finalize chunked upload and start NodeODM processing. Returns upload response with task_id, nodeodm_task_id, etc.
   */
  async uploadFinalize(
    taskId: string,
    files: ChunkedFileInfo[],
    taskName?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('files', JSON.stringify(files));
    if (taskName) formData.append('task_name', taskName);

    const response = await fetch(`${this.baseUrl}/api/v1/upload/finalize`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload finalize failed: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async uploadBoundaryFiles(taskId: string, files: File[]): Promise<{ message: string; task_id: string; file_count: number; files: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await fetch(`${this.baseUrl}/api/v1/upload/${taskId}/boundary`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Boundary upload failed: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async getUploadSettings(): Promise<UploadSystemSettings> {
    const response = await fetch(`${this.baseUrl}/api/v1/upload/settings`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload settings: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async updateUploadSettings(body: UploadSystemSettingsUpdate): Promise<UploadSystemSettings> {
    const response = await fetch(`${this.baseUrl}/api/v1/upload/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update upload settings: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async resetUploadSettings(): Promise<UploadSystemSettings> {
    const response = await fetch(`${this.baseUrl}/api/v1/upload/settings/reset`, {
      method: 'POST',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reset upload settings: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async resetPrescriptionModuleSettings(): Promise<UploadSystemSettings> {
    const response = await fetch(`${this.baseUrl}/api/v1/upload/settings/reset/prescription`, {
      method: 'POST',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reset prescription settings: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async resetNodeOdmSettings(): Promise<UploadSystemSettings> {
    const response = await fetch(`${this.baseUrl}/api/v1/upload/settings/reset/nodeodm`, {
      method: 'POST',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reset NodeODM settings: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  async getProcessedFile(taskId: string, fileName: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/results/${taskId}/${fileName}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get processed file: ${response.status} ${errorText}`);
    }
    return response.blob();
  }

  async listResults(): Promise<Array<{ taskId: string; orthophotoPngUrl: string; reportPdfUrl?: string; taskName?: string }>> {
    const response = await fetch(`${this.baseUrl}/api/v1/results/`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list results: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  /**
   * Delete all stored results/artifacts for a task.
   */
  async deleteTaskResults(taskId: string): Promise<DeleteTaskResultsResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/results/${taskId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Delete task results failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get task status from backend
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/upload/${taskId}/status`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get task status: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if backend is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      console.log(`Checking backend availability at: ${this.baseUrl}/health`);
      await this.healthCheck();
      console.log('Backend health check successful');
      return true;
    } catch (error) {
      console.error('Backend not available:', error);
      console.error('Attempted URL:', `${this.baseUrl}/health`);
      return false;
    }
  }

  /**
   * Get stored RTK base station coordinates (longitude, latitude). Defaults to (0, 0) if not set.
   */
  async getRtkBase(): Promise<{ longitude: number; latitude: number }> {
    const response = await fetch(`${this.baseUrl}/api/v1/pathing/rtk-base`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get RTK base failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Save RTK base station coordinates for path generation (relative easting/northing).
   */
  async setRtkBase(
    longitude: number,
    latitude: number
  ): Promise<{ longitude: number; latitude: number }> {
    const response = await fetch(`${this.baseUrl}/api/v1/pathing/rtk-base`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longitude, latitude }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Set RTK base failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Submit shapefile components for path generation (preview). Returns path_job_id; poll status then fetch result.
   * Only the most recent path is kept on the backend. Use savePathToTask to persist when linking to a task.
   * Optional rtkBase updates stored RTK base and is used for relative easting/northing in the saved track.
   */
  async submitPathJob(
    files: File[],
    heading: number,
    robotWidth: number,
    coverageWidth: number,
    boundaryName?: string,
    rtkBase?: { longitude: number; latitude: number }
  ): Promise<{
    path_job_id: string;
    status: string;
    heading: number;
    robot_width: number;
    coverage_width: number;
    files: string[];
    boundary_name?: string;
  }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('heading', heading.toString());
    formData.append('robot_width', robotWidth.toString());
    formData.append('coverage_width', coverageWidth.toString());
    if (boundaryName !== undefined && boundaryName !== '') {
      formData.append('boundary_name', boundaryName);
    }
    if (rtkBase !== undefined) {
      formData.append('base_lon', rtkBase.longitude.toString());
      formData.append('base_lat', rtkBase.latitude.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/v1/pathing/`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Path job failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  async submitPathJobFromTask(
    taskId: string,
    heading: number,
    robotWidth: number,
    coverageWidth: number,
    boundaryName?: string,
    rtkBase?: { longitude: number; latitude: number }
  ): Promise<{
    path_job_id: string;
    status: string;
    heading: number;
    robot_width: number;
    coverage_width: number;
    files: string[];
    boundary_name?: string;
  }> {
    const buildFormData = () => {
      const formData = new FormData();
      formData.append('task_id', taskId);
      formData.append('heading', heading.toString());
      formData.append('robot_width', robotWidth.toString());
      formData.append('coverage_width', coverageWidth.toString());
      if (boundaryName !== undefined && boundaryName !== '') {
        formData.append('boundary_name', boundaryName);
      }
      if (rtkBase !== undefined) {
        formData.append('base_lon', rtkBase.longitude.toString());
        formData.append('base_lat', rtkBase.latitude.toString());
      }
      return formData;
    };

    const attempt = async (path: string) => {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        body: buildFormData(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Path job failed: ${response.status} ${text}`);
      }
      return response.json();
    };

    try {
      return await attempt('/api/v1/pathing/jobs/from-task');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('404') && !message.includes('405')) {
        throw error;
      }
      return attempt('/api/v1/pathing/from-task');
    }
  }

  /**
   * Save the current path to a NodeODM task (stitched field). Call after linking; persists robot_path.json.
   */
  async savePathToTask(pathJobId: string, taskId: string): Promise<{ message: string; task_id: string }> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    const response = await fetch(`${this.baseUrl}/api/v1/pathing/${pathJobId}/save`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Save path failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get path job status. Returns { status: 'processing' | 'completed' | 'failed', error? }.
   */
  async getPathJobStatus(pathJobId: string): Promise<{ status: string; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/pathing/${pathJobId}/status`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Path status failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get path job result. When status is completed, returns waypoints and metadata.
   */
  async getPathJobResult(pathJobId: string): Promise<{
    status: string;
    waypoints?: Array<{ lat: number; lon: number }>;
    heading?: number;
    generated_at?: string;
    robot_width?: number;
    coverage_width?: number;
    boundary_name?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/pathing/${pathJobId}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Path result failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * List tasks that have a prescription file.
   */
  async listPrescriptions(): Promise<PrescriptionListResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`List prescriptions failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get prescription generation status for a task.
   */
  async getPrescriptionStatus(taskId: string): Promise<PrescriptionStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/${taskId}/status`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prescription status failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get per-task prescription module configuration (merged JSON on disk).
   */
  async getPrescriptionConfig(taskId: string): Promise<PrescriptionConfig> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/${taskId}/config`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get prescription config failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get prescription GeoJSON for a task.
   */
  async getPrescription(taskId: string): Promise<PrescriptionGeoJSON> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/${taskId}`, {
      headers: { Accept: 'application/geo+json' },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get prescription failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get robot-native saved path for a task.
   */
  async getTaskRobotPath(taskId: string): Promise<RobotPathRawResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/results/${taskId}/robot-path`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get robot path failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Get display-safe path coordinates (EPSG:4326) for frontend map overlays.
   */
  async getTaskDisplayPath(taskId: string): Promise<DisplayPathResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/results/${taskId}/display-path`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get display path failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Download available robot-related files for a task as a zip bundle.
   */
  async downloadTaskRobotFilesZip(taskId: string): Promise<{ blob: Blob; missing: string[]; included: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/results/${taskId}/robot-files.zip`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Download robot files failed: ${response.status} ${text}`);
    }
    const parseHeaderList = (value: string | null): string[] => {
      if (!value) return [];
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    };

    const missing = parseHeaderList(response.headers.get('X-Missing-Files'));
    const included = parseHeaderList(response.headers.get('X-Included-Files'));
    const blob = await response.blob();
    return { blob, missing, included };
  }

  /**
   * Update prescription spray levels for features.
   */
  async updatePrescription(taskId: string, body: PrescriptionUpdateRequest): Promise<PrescriptionGeoJSON> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Update prescription failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Set per-task prescription module configuration.
   */
  async setPrescriptionConfig(taskId: string, config: PrescriptionConfig): Promise<PrescriptionConfig> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/${taskId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Set prescription config failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Queue prescription regeneration (runs in the background). Poll GET .../status until completed or failed.
   */
  async triggerPrescriptionGeneration(taskId: string): Promise<PrescriptionGenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/prescription/${taskId}/generate`, {
      method: 'POST',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prescription generation failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  /**
   * Test backend connection with detailed error info
   */
  async testConnection(): Promise<{ success: boolean; error?: string; url?: string }> {
    try {
      console.log('Testing backend connection...');
      console.log('Base URL:', this.baseUrl);
      console.log('Health endpoint:', `${this.baseUrl}/health`);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Health check failed:', response.status, errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}`,
          url: `${this.baseUrl}/health`
        };
      }
      
      const data = await response.json();
      console.log('Health check response:', data);
      return { success: true, url: `${this.baseUrl}/health` };
      
    } catch (error) {
      console.error('Connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        url: `${this.baseUrl}/health`
      };
    }
  }
}

// Export class (for static constants) and singleton instance
export { ApiService };
export const apiService = new ApiService();
export default apiService;
