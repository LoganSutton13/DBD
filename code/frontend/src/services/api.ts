/**
 * API service for backend communication
 */

import {
  UploadResponse,
  UploadInitResponse,
  ChunkedFileInfo,
  TaskStatusResponse,
  ProcessingTask,
} from '../types/upload';

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

  /**
   * Upload files to the backend
   */
  async uploadFiles(files: File[], taskName?: string, heading?: number, gridSize?: number): Promise<UploadResponse> {
    const formData = new FormData();
    
    // Add all files to FormData
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (taskName) {
      formData.append('task_name', taskName);
    }
    if (heading !== undefined) {
      formData.append('heading', heading.toString());
    }
    if (gridSize !== undefined) {
      formData.append('grid_size', gridSize.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/v1/upload/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /** Default chunk size for chunked uploads (5MB). */
  static readonly CHUNK_SIZE = 5 * 1024 * 1024;

  /** Threshold: use chunked upload when total size exceeds this (100MB). */
  static readonly CHUNKED_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

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
   * Finalize chunked upload and start NodeODM processing. Returns same shape as uploadFiles.
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
   * Submit shapefile components for path generation (preview). Returns path_job_id; poll status then fetch result.
   * Only the most recent path is kept on the backend. Use savePathToTask to persist when linking to a task.
   */
  async submitPathJob(
    files: File[],
    heading: number,
    robotWidth: number,
    coverageWidth: number,
    boundaryName?: string
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
