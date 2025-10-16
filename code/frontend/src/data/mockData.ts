import { ProcessedOutput, ProcessingTask } from '../types/processedOutput';

// Mock data for testing the frontend
export const mockProcessingTasks: ProcessingTask[] = [
  {
    id: 'task-001',
    nodeodmTaskId: 'nodeodm-abc123',
    status: 'completed',
    progress: 100,
    fileCount: 18,
    files: ['DJI_0018.JPG', 'DJI_0019.JPG', 'DJI_0020.JPG', 'DJI_0021.JPG', 'DJI_0022.JPG', 'DJI_0023.JPG', 'DJI_0024.JPG', 'DJI_0025.JPG', 'DJI_0026.JPG', 'DJI_0027.JPG', 'DJI_0028.JPG', 'DJI_0029.JPG', 'DJI_0030.JPG', 'DJI_0031.JPG', 'DJI_0032.JPG', 'DJI_0033.JPG', 'DJI_0034.JPG', 'DJI_0035.JPG'],
    createdAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-15T11:45:00Z',
    outputs: [
      {
        id: 'output-001',
        taskId: 'task-001',
        fileName: 'orthophoto.tif',
        fileType: 'orthophoto',
        originalFormat: 'TIF',
        previewUrl: '/api/placeholder/orthophoto-preview.jpg',
        downloadUrl: '/api/download/orthophoto.tif',
        fileSize: 45.2 * 1024 * 1024, // 45.2 MB
        createdAt: '2024-01-15T11:45:00Z',
        metadata: {
          resolution: 3.0, // 3cm/pixel
          area: '2.5 acres',
          dimensions: {
            width: 4000,
            height: 3000
          },
          georeferencing: {
            bounds: {
              minX: -122.4194,
              minY: 37.7749,
              maxX: -122.4184,
              maxY: 37.7759
            },
            projection: 'EPSG:4326'
          }
        }
      },
      {
        id: 'output-002',
        taskId: 'task-001',
        fileName: 'contours.dxf',
        fileType: 'contour',
        originalFormat: 'DXF',
        previewUrl: '/api/placeholder/contours-preview.svg',
        downloadUrl: '/api/download/contours.dxf',
        fileSize: 2.1 * 1024 * 1024, // 2.1 MB
        createdAt: '2024-01-15T11:45:00Z',
        metadata: {
          area: '2.5 acres',
          dimensions: {
            width: 2000,
            height: 1500
          }
        }
      }
    ]
  },
  {
    id: 'task-002',
    nodeodmTaskId: 'nodeodm-def456',
    status: 'completed',
    progress: 100,
    fileCount: 12,
    files: ['IMG_0001.JPG', 'IMG_0002.JPG', 'IMG_0003.JPG', 'IMG_0004.JPG', 'IMG_0005.JPG', 'IMG_0006.JPG', 'IMG_0007.JPG', 'IMG_0008.JPG', 'IMG_0009.JPG', 'IMG_0010.JPG', 'IMG_0011.JPG', 'IMG_0012.JPG'],
    createdAt: '2024-01-14T14:20:00Z',
    completedAt: '2024-01-14T15:30:00Z',
    outputs: [
      {
        id: 'output-003',
        taskId: 'task-002',
        fileName: 'field_map.tif',
        fileType: 'orthophoto',
        originalFormat: 'TIF',
        previewUrl: '/api/placeholder/field-map-preview.jpg',
        downloadUrl: '/api/download/field_map.tif',
        fileSize: 32.8 * 1024 * 1024, // 32.8 MB
        createdAt: '2024-01-14T15:30:00Z',
        metadata: {
          resolution: 2.5, // 2.5cm/pixel
          area: '1.8 acres',
          dimensions: {
            width: 3500,
            height: 2800
          },
          georeferencing: {
            bounds: {
              minX: -122.4200,
              minY: 37.7750,
              maxX: -122.4190,
              maxY: 37.7760
            },
            projection: 'EPSG:4326'
          }
        }
      },
      {
        id: 'output-004',
        taskId: 'task-002',
        fileName: 'elevation_contours.dxf',
        fileType: 'contour',
        originalFormat: 'DXF',
        previewUrl: '/api/placeholder/elevation-contours-preview.svg',
        downloadUrl: '/api/download/elevation_contours.dxf',
        fileSize: 1.8 * 1024 * 1024, // 1.8 MB
        createdAt: '2024-01-14T15:30:00Z',
        metadata: {
          area: '1.8 acres',
          dimensions: {
            width: 1800,
            height: 1400
          }
        }
      },
      {
        id: 'output-005',
        taskId: 'task-002',
        fileName: 'boundary_map.tif',
        fileType: 'map',
        originalFormat: 'TIF',
        previewUrl: '/api/placeholder/boundary-map-preview.jpg',
        downloadUrl: '/api/download/boundary_map.tif',
        fileSize: 28.5 * 1024 * 1024, // 28.5 MB
        createdAt: '2024-01-14T15:30:00Z',
        metadata: {
          resolution: 5.0, // 5cm/pixel
          area: '1.8 acres',
          dimensions: {
            width: 2000,
            height: 1600
          }
        }
      }
    ]
  },
  {
    id: 'task-003',
    nodeodmTaskId: 'nodeodm-ghi789',
    status: 'processing',
    progress: 65,
    fileCount: 25,
    files: ['DRONE_001.JPG', 'DRONE_002.JPG', 'DRONE_003.JPG', 'DRONE_004.JPG', 'DRONE_005.JPG', 'DRONE_006.JPG', 'DRONE_007.JPG', 'DRONE_008.JPG', 'DRONE_009.JPG', 'DRONE_010.JPG', 'DRONE_011.JPG', 'DRONE_012.JPG', 'DRONE_013.JPG', 'DRONE_014.JPG', 'DRONE_015.JPG', 'DRONE_016.JPG', 'DRONE_017.JPG', 'DRONE_018.JPG', 'DRONE_019.JPG', 'DRONE_020.JPG', 'DRONE_021.JPG', 'DRONE_022.JPG', 'DRONE_023.JPG', 'DRONE_024.JPG', 'DRONE_025.JPG'],
    createdAt: '2024-01-16T09:15:00Z',
    outputs: []
  }
];

export const mockProcessedOutputs: ProcessedOutput[] = mockProcessingTasks
  .filter(task => task.status === 'completed')
  .flatMap(task => task.outputs);
