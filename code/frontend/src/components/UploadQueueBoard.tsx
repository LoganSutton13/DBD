import React from 'react';
import { ProcessingTask } from '../types/upload';

interface UploadQueueBoardProps {
  queuedTasks: ProcessingTask[];
  runningTasks: ProcessingTask[];
  recentCompletedResults: Array<{ taskId: string; taskName?: string }>;
  isPolling: boolean;
}

const TaskChip: React.FC<{ title: string; subtitle?: string; progress?: number }> = ({
  title,
  subtitle,
  progress,
}) => (
  <div className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-2">
    <p className="truncate text-sm text-dark-100">{title}</p>
    {subtitle ? <p className="text-xs text-dark-400">{subtitle}</p> : null}
    {typeof progress === 'number' ? (
      <div className="mt-2 h-1.5 w-full rounded bg-dark-500">
        <div className="h-1.5 rounded bg-primary-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    ) : null}
  </div>
);

const UploadQueueBoard: React.FC<UploadQueueBoardProps> = ({
  queuedTasks,
  runningTasks,
  recentCompletedResults,
  isPolling,
}) => {
  return (
    <div className="rounded-lg border border-dark-700 bg-dark-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-medium text-primary-400">Processing Queue</h3>
        <span className="text-xs text-dark-400">{isPolling ? 'Updating...' : 'Auto-updates every 3s'}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-dark-600 bg-dark-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-yellow-400">Queued</p>
            <span className="text-xs text-yellow-400">{queuedTasks.length}</span>
          </div>
          <div className="space-y-2">
            {queuedTasks.length === 0 ? (
              <p className="text-xs text-dark-400">No queued jobs</p>
            ) : (
              queuedTasks.slice(0, 3).map((task) => (
                <TaskChip key={task.id} title={task.task_name || `Task ${task.id.slice(0, 8)}`} subtitle={`${task.file_count} files`} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dark-600 bg-dark-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-blue-400">Running</p>
            <span className="text-xs text-blue-400">{runningTasks.length}</span>
          </div>
          <div className="space-y-2">
            {runningTasks.length === 0 ? (
              <p className="text-xs text-dark-400">No running jobs</p>
            ) : (
              runningTasks.slice(0, 3).map((task) => (
                <TaskChip
                  key={task.id}
                  title={task.task_name || `Task ${task.id.slice(0, 8)}`}
                  subtitle={`${Math.round(task.progress)}% complete`}
                  progress={task.progress}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dark-600 bg-dark-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-green-400">Completed</p>
            <span className="text-xs text-green-400">{recentCompletedResults.length}</span>
          </div>
          <div className="space-y-2">
            {recentCompletedResults.length === 0 ? (
              <p className="text-xs text-dark-400">No completed jobs yet</p>
            ) : (
              recentCompletedResults.map((result) => (
                <TaskChip
                  key={result.taskId}
                  title={result.taskName || `Task ${result.taskId.slice(0, 8)}`}
                  subtitle={`ID ${result.taskId.slice(0, 8)}`}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadQueueBoard;
