import { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import { ProcessingTask, UploadResponse } from '../types/upload';

const PROCESSING_TASKS_KEY = 'processingTasks';
const PENDING_UPLOADS_KEY = 'pendingUploads';

const isQueuedStatus = (status: string): boolean => {
  const normalized = status.toLowerCase();
  return normalized.includes('queued');
};

const isRunningStatus = (status: string): boolean => {
  const normalized = status.toLowerCase();
  return normalized === 'processing' || normalized.includes('running');
};

const isCompletedStatus = (status: string): boolean => {
  const normalized = status.toLowerCase();
  return normalized === 'completed' || normalized === 'success';
};

const isFailedStatus = (status: string): boolean => {
  const normalized = status.toLowerCase();
  return normalized === 'failed' || normalized === 'error';
};

const toProcessingTask = (uploadResponse: UploadResponse): ProcessingTask => ({
  id: uploadResponse.task_id,
  nodeodm_task_id: uploadResponse.nodeodm_task_id,
  status: uploadResponse.status || 'processing',
  progress: 0,
  file_count: uploadResponse.file_count || 0,
  files: uploadResponse.files || [],
  created_at: uploadResponse.created_at || new Date().toISOString(),
  task_name: uploadResponse.task_name,
});

export const useProcessingQueue = () => {
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const persistTasks = useCallback((tasks: ProcessingTask[]) => {
    localStorage.setItem(PROCESSING_TASKS_KEY, JSON.stringify(tasks));
  }, []);

  const addUploadToQueue = useCallback(
    (uploadResponse: UploadResponse) => {
      const nextTask = toProcessingTask(uploadResponse);
      setProcessingTasks((prev) => {
        if (prev.some((task) => task.id === nextTask.id)) {
          return prev;
        }
        const updated = [...prev, nextTask];
        persistTasks(updated);
        return updated;
      });
      window.dispatchEvent(new CustomEvent('newUpload', { detail: uploadResponse }));
    },
    [persistTasks]
  );

  useEffect(() => {
    const savedTasks = localStorage.getItem(PROCESSING_TASKS_KEY);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks) as ProcessingTask[];
        setProcessingTasks(parsed);
      } catch {
        setProcessingTasks([]);
      }
    }

    const pendingUploads = localStorage.getItem(PENDING_UPLOADS_KEY);
    if (!pendingUploads) return;

    try {
      const uploads = JSON.parse(pendingUploads) as UploadResponse[];
      setProcessingTasks((prev) => {
        const updated = [...prev];
        uploads.forEach((upload) => {
          const task = toProcessingTask(upload);
          if (!updated.some((item) => item.id === task.id)) {
            updated.push(task);
          }
        });
        persistTasks(updated);
        return updated;
      });
      localStorage.removeItem(PENDING_UPLOADS_KEY);
    } catch {
      // Ignore invalid local state.
    }
  }, [persistTasks]);

  useEffect(() => {
    const handleNewUpload = (event: Event) => {
      const customEvent = event as CustomEvent<UploadResponse>;
      const detail = customEvent.detail;
      if (!detail?.task_id || !detail?.nodeodm_task_id) return;
      const nextTask = toProcessingTask(detail);
      setProcessingTasks((prev) => {
        if (prev.some((task) => task.id === nextTask.id)) {
          return prev;
        }
        const updated = [...prev, nextTask];
        persistTasks(updated);
        return updated;
      });
    };

    window.addEventListener('newUpload', handleNewUpload);
    return () => window.removeEventListener('newUpload', handleNewUpload);
  }, [persistTasks]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const activeTasks = processingTasks.filter(
        (task) => isQueuedStatus(task.status) || isRunningStatus(task.status)
      );
      if (activeTasks.length === 0) return;

      setIsPolling(true);
      try {
        const polled = await Promise.all(
          activeTasks.map(async (task) => {
            try {
              const status = await apiService.getTaskStatus(task.nodeodm_task_id);
              return {
                ...task,
                status: status.status,
                progress: parseFloat(status.progress) || 0,
              };
            } catch (error) {
              return {
                ...task,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Polling failed',
              };
            }
          })
        );

        setProcessingTasks((prev) => {
          const updated = prev.map((task) => polled.find((item) => item.id === task.id) || task);
          persistTasks(updated);
          return updated;
        });
      } finally {
        setIsPolling(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [persistTasks, processingTasks]);

  const queuedTasks = useMemo(
    () => processingTasks.filter((task) => isQueuedStatus(task.status)),
    [processingTasks]
  );
  const runningTasks = useMemo(
    () => processingTasks.filter((task) => isRunningStatus(task.status)),
    [processingTasks]
  );
  const completedTasks = useMemo(
    () => processingTasks.filter((task) => isCompletedStatus(task.status)),
    [processingTasks]
  );
  const failedTasks = useMemo(
    () => processingTasks.filter((task) => isFailedStatus(task.status)),
    [processingTasks]
  );

  return {
    processingTasks,
    queuedTasks,
    runningTasks,
    completedTasks,
    failedTasks,
    isPolling,
    addUploadToQueue,
  };
};
