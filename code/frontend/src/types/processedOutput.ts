export interface ProcessedOutput {
  id: string;
  taskId: string;
  fileName: string;
  fileType: 'orthophoto' | 'contour' | 'map';
  originalFormat: 'TIF' | 'TFW' | 'DXF';
  previewUrl: string; // For web-friendly preview (JPEG for TIF, SVG for DXF)
  downloadUrl: string; // For original file download
  fileSize: number; // in bytes
  createdAt: string;
  metadata: {
    resolution?: number; // cm/pixel for orthophotos
    area?: string; // Area covered
    dimensions?: {
      width: number;
      height: number;
    };
    georeferencing?: {
      bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
      };
      projection?: string;
    };
  };
}

export interface ProcessingTask {
  id: string;
  nodeodmTaskId: string;
  status: 'completed' | 'processing' | 'failed';
  progress: number;
  fileCount: number;
  files: string[];
  createdAt: string;
  completedAt?: string;
  outputs: ProcessedOutput[];
}

export type FileTypeFilter = 'all' | 'orthophoto' | 'contour' | 'map';
export type SortOption = 'newest' | 'oldest' | 'name' | 'size';
