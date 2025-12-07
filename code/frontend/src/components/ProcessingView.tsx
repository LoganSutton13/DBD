import React, { useState, useEffect } from 'react';
import { ProcessingTask, TaskStatusResponse } from '../types/upload';
import apiService from '../services/api';

const ProcessingView: React.FC = () => {
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  // Poll for task status updates
  const pollTaskStatus = async (taskId: string) => {
    try {
      const statusResponse = await apiService.getTaskStatus(taskId);
      return statusResponse;
    } catch (error) {
      console.error(`Failed to poll status for task ${taskId}:`, error);
      return null;
    }
  };


  // Load processing tasks from localStorage and check for pending uploads
  useEffect(() => {
    const loadTasks = () => {
      const savedTasks = localStorage.getItem('processingTasks');
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          console.log('Loaded tasks from localStorage:', tasks);
          console.log('Task statuses found:', tasks.map((t: ProcessingTask) => `"${t.status}"`).join(', '));
          setProcessingTasks(tasks);
        } catch (error) {
          console.error('Failed to parse saved tasks:', error);
        }
      }
      
      // Check for pending uploads that might have been missed
      const pendingUploads = localStorage.getItem('pendingUploads');
      if (pendingUploads) {
        try {
          const uploads = JSON.parse(pendingUploads);
          console.log('Found pending uploads:', uploads);
          
          uploads.forEach((uploadResponse: any) => {
            console.log('Processing pending upload:', uploadResponse);
            const newTask: ProcessingTask = {
              id: uploadResponse.task_id,
              nodeodm_task_id: uploadResponse.nodeodm_task_id,
              status: uploadResponse.status || 'processing',
              progress: 0,
              file_count: uploadResponse.file_count || 0,
              files: uploadResponse.files || [],
              created_at: uploadResponse.created_at || new Date().toISOString(),
              task_name: uploadResponse.task_name,
            };
            
            setProcessingTasks(prev => {
              const exists = prev.some(task => task.id === newTask.id);
              if (!exists) {
                const updated = [...prev, newTask];
                localStorage.setItem('processingTasks', JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          });
          
          // Clear pending uploads after processing
          localStorage.removeItem('pendingUploads');
        } catch (error) {
          console.error('Failed to parse pending uploads:', error);
        }
      }
    };

    loadTasks();
  }, []);

  // Poll for status updates
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      // Get current tasks and filter for active ones
      setProcessingTasks(currentTasks => {
        const activeTasks = currentTasks.filter(task => 
          task.status === 'processing' || 
          task.status === 'queued' || 
          task.status === 'TaskStatus.RUNNING' ||
          task.status === 'RUNNING' ||
          task.status === 'TaskStatus.QUEUED' ||
          task.status === 'QUEUED'
        );
        
        if (activeTasks.length === 0) {
          return currentTasks; // No active tasks to poll
        }

        console.log(`Polling ${activeTasks.length} active tasks...`);
        setIsPolling(true);

        // Poll each active task for status updates
        (async () => {
          
          try {
            // Only poll active tasks
            const updatedTasks = await Promise.all(
              activeTasks.map(async (task) => {
                try {
                  console.log(`Polling NodeODM task: ${task.nodeodm_task_id} for frontend task: ${task.id}`);
                  const statusResponse = await pollTaskStatus(task.nodeodm_task_id);
                  if (statusResponse) {
                    const newStatus = statusResponse.status;
                    const newProgress = parseFloat(statusResponse.progress) || 0;
                    
                    console.log(`Task ${task.id} (NodeODM: ${task.nodeodm_task_id}) status:`, {
                      oldStatus: task.status,
                      newStatus: newStatus,
                      oldProgress: task.progress,
                      newProgress: newProgress
                    });
                    
                    // Debug: Log all possible status values to understand NodeODM responses
                    console.log(`DEBUG: Raw NodeODM status response:`, statusResponse);
                    console.log(`DEBUG: Task ${task.id} status values - Old: "${task.status}", New: "${newStatus}"`);

                    // Check if task is completed or failed
                    const isFinished = newStatus === 'completed' || 
                                     newStatus === 'success' || 
                                     newStatus === 'failed' || 
                                     newStatus === 'error';
                    
                    if (isFinished) {
                      console.log(`Task ${task.id} (NodeODM: ${task.nodeodm_task_id}) finished with status: ${newStatus}`);
                    }

                    return {
                      ...task,
                      status: newStatus,
                      progress: newProgress,
                    };
                  }
                } catch (error) {
                  console.error(`Failed to poll task ${task.id} (NodeODM: ${task.nodeodm_task_id}):`, error);
                  // If polling fails, mark task as failed
                  return {
                    ...task,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Polling failed'
                  };
                }
                return task;
              })
            );

            // Update all tasks with the new information
            const finalUpdatedTasks = currentTasks.map(task => {
              const updatedTask = updatedTasks.find(ut => ut.id === task.id);
              return updatedTask || task;
            });

            // Check if there are any changes
            const hasChanges = finalUpdatedTasks.some((task, index) => 
              task.status !== currentTasks[index].status || 
              task.progress !== currentTasks[index].progress
            );

            if (hasChanges) {
              localStorage.setItem('processingTasks', JSON.stringify(finalUpdatedTasks));
              setProcessingTasks(finalUpdatedTasks);
              
              // Log completion summary
              const completedCount = finalUpdatedTasks.filter(t => 
                t.status === 'completed' || t.status === 'success'
              ).length;
              const failedCount = finalUpdatedTasks.filter(t => 
                t.status === 'failed' || t.status === 'error'
              ).length;
              
              if (completedCount > 0 || failedCount > 0) {
                console.log(`Task summary: ${completedCount} completed, ${failedCount} failed`);
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          } finally {
            setIsPolling(false);
          }
        })();
        
        return currentTasks; // Return current state immediately
      });
    }, 3000); // Poll every 3 seconds automatically

    return () => clearInterval(pollInterval);
  }, []); // Run continuously, no dependencies

  // Listen for new uploads from other components
  useEffect(() => {
    console.log('ProcessingView: Setting up newUpload event listener');
    
    const handleNewUpload = (event: CustomEvent) => {
      console.log('ProcessingView: Received new upload event:', event.detail);
      const uploadResponse = event.detail;
      
      // Validate the upload response
      if (!uploadResponse || !uploadResponse.task_id || !uploadResponse.nodeodm_task_id) {
        console.error('Invalid upload response:', uploadResponse);
        return;
      }
      
      const newTask: ProcessingTask = {
        id: uploadResponse.task_id,
        nodeodm_task_id: uploadResponse.nodeodm_task_id,
        status: uploadResponse.status || 'processing',
        progress: 0,
        file_count: uploadResponse.file_count || 0,
        files: uploadResponse.files || [],
        created_at: uploadResponse.created_at || new Date().toISOString(),
        task_name: uploadResponse.task_name,
      };

      console.log('Adding new task to processing queue:', newTask);
      setProcessingTasks(prev => {
        // Check if task already exists to avoid duplicates
        const exists = prev.some(task => task.id === newTask.id);
        if (exists) {
          console.log('Task already exists, not adding duplicate:', newTask.id);
          return prev;
        }
        
        const updated = [...prev, newTask];
        localStorage.setItem('processingTasks', JSON.stringify(updated));
        return updated;
      });
    };

    console.log('ProcessingView: Adding event listener for newUpload');
    window.addEventListener('newUpload', handleNewUpload as EventListener);
    
    return () => {
      console.log('ProcessingView: Removing event listener for newUpload');
      window.removeEventListener('newUpload', handleNewUpload as EventListener);
    };
  }, []);


  // Manual refresh function (triggers immediate polling)
  const refreshProcessingQueue = async () => {
    console.log('Manual refresh triggered');
    
    // Trigger the same polling logic immediately
    const currentTasks = processingTasks;
    const activeTasks = currentTasks.filter(task => 
      task.status === 'processing' || 
      task.status === 'queued' || 
      task.status === 'TaskStatus.RUNNING' ||
      task.status === 'RUNNING' ||
      task.status === 'TaskStatus.QUEUED' ||
      task.status === 'QUEUED'
    );
    
    if (activeTasks.length === 0) {
      console.log('No active tasks to refresh');
      return;
    }

    console.log(`Manually refreshing ${activeTasks.length} active tasks`);
    
    try {
      
      // Poll each active task
      const updatedTasks = await Promise.all(
        activeTasks.map(async (task) => {
          try {
            console.log(`Manual refresh - Polling NodeODM task: ${task.nodeodm_task_id} for frontend task: ${task.id}`);
            const statusResponse = await pollTaskStatus(task.nodeodm_task_id);
            if (statusResponse) {
              console.log(`Manual refresh - Task ${task.id} (NodeODM: ${task.nodeodm_task_id}) status:`, statusResponse);
              return {
                ...task,
                status: statusResponse.status,
                progress: parseFloat(statusResponse.progress) || 0,
              };
            }
          } catch (error) {
            console.error(`Manual refresh failed for task ${task.id} (NodeODM: ${task.nodeodm_task_id}):`, error);
            return {
              ...task,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Polling failed'
            };
          }
          return task;
        })
      );

      // Update all tasks with new information
      const finalUpdatedTasks = currentTasks.map(task => {
        const updatedTask = updatedTasks.find(ut => ut.id === task.id);
        return updatedTask || task;
      });

      setProcessingTasks(finalUpdatedTasks);
      localStorage.setItem('processingTasks', JSON.stringify(finalUpdatedTasks));
    } catch (error) {
      console.error('Manual refresh error:', error);
    }
  };

  // Download processed files for a completed task
  const downloadProcessedFiles = async (task: ProcessingTask) => {
    try {
      console.log(`Downloading files for task ${task.id}`);
      
      // For now, we'll download the original files since we don't have processed file names yet
      // In a real implementation, you'd get the list of processed files from the backend
      const processedFileNames = [
        'orthophoto.tif',
        'orthophoto.png', 
        'dsm.tif',
        'dtm.tif',
        'report.pdf'
      ];

      for (const fileName of processedFileNames) {
        try {
          const blob = await apiService.getProcessedFile(task.id, fileName);
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${task.id.slice(0, 8)}_${fileName}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          console.log(`Downloaded ${fileName} for task ${task.id}`);
        } catch (error) {
          console.log(`File ${fileName} not available for task ${task.id}:`, error);
          // Continue with other files even if one fails
        }
      }
    } catch (error) {
      console.error(`Failed to download files for task ${task.id}:`, error);
      setError(`Failed to download files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const activeTasks = processingTasks.filter(task => 
    task.status === 'processing' || 
    task.status === 'queued' || 
    task.status === 'TaskStatus.RUNNING' ||
    task.status === 'RUNNING' ||
    task.status === 'TaskStatus.QUEUED' ||
    task.status === 'QUEUED'
  );
  
  // Separate running and queued tasks for better UI organization
  const runningTasks = processingTasks.filter(task => 
    task.status === 'processing' || 
    task.status === 'TaskStatus.RUNNING' ||
    task.status === 'RUNNING'
  );
  
  const queuedTasks = processingTasks.filter(task => 
    task.status === 'queued' ||
    task.status === 'TaskStatus.QUEUED' ||
    task.status === 'QUEUED'
  );
  const completedTasks = processingTasks.filter(task => {
    const isCompleted = task.status === 'completed' || 
                       task.status === 'success' ||
                       task.status === 'COMPLETED' ||
                       task.status === 'SUCCESS' ||
                       task.status === 'TaskStatus.COMPLETED' ||
                       task.status === 'TaskStatus.SUCCESS';
    
    // Debug logging for completed task detection
    if (isCompleted) {
      console.log(`Found completed task: ${task.id} with status: "${task.status}"`);
    }
    
    return isCompleted;
  });
  const failedTasks = processingTasks.filter(task => 
    task.status === 'failed' || task.status === 'error'
  );
  
  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold text-primary-400">
            Processing Queue
          </h2>
          <div className="min-w-[220px]">
            {!isDebugOpen && (
              <div className="flex items-center justify-end space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-blue-500' : backendAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-dark-300">
                  {isPolling ? 'Polling…' : backendAvailable ? 'Backend Connected' : 'Backend Disconnected'}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsDebugOpen(v => !v)}
              className="w-full px-3 py-1 bg-dark-700 text-dark-200 text-xs rounded hover:bg-dark-600 transition-colors duration-200"
            >
              {isDebugOpen ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
        </div>
        <p className="text-dark-300 mb-6">
          Monitor your image stitching and processing jobs
        </p>
        
        {/* Debug info */}
        {isDebugOpen && (
        <div className="mb-4 p-3 bg-dark-700 rounded-lg text-xs">
          <p className="text-dark-400">
            <strong>Processing Status:</strong> {processingTasks.length} total tasks, {runningTasks.length} running, {queuedTasks.length} queued
            {activeTasks.length > 0 && (
              <span className={`ml-2 ${isPolling ? 'text-blue-400' : 'text-green-400'}`}>
                • {isPolling ? 'Polling now...' : 'Auto-polling every 3s'}
              </span>
            )}
            {processingTasks.length > 0 && (
              <span className="ml-2">
                • Latest: {processingTasks[processingTasks.length - 1].id.slice(0, 8)} ({processingTasks[processingTasks.length - 1].status})
              </span>
            )}
          </p>
          
          {/* Debug: Show all tasks and their statuses */}
          {processingTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-600">
              <p className="text-dark-400 mb-2"><strong>All Tasks Debug:</strong></p>
              <div className="space-y-1">
                {processingTasks.map((task, index) => {
                  const isCompleted = task.status === 'completed' || 
                                   task.status === 'success' ||
                                   task.status === 'COMPLETED' ||
                                   task.status === 'SUCCESS' ||
                                   task.status === 'TaskStatus.COMPLETED' ||
                                   task.status === 'TaskStatus.SUCCESS';
                  
                  return (
                    <div key={task.id} className="flex justify-between items-center text-xs">
                      <span className="text-dark-300">
                        #{index + 1}: {task.id.slice(0, 8)} ({task.file_count} files)
                        {isCompleted && <span className="text-green-400 ml-2">✓ COMPLETED</span>}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.status === 'processing' || task.status === 'TaskStatus.RUNNING' || task.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' :
                        task.status === 'queued' || task.status === 'TaskStatus.QUEUED' || task.status === 'QUEUED' ? 'bg-yellow-500/20 text-yellow-400' :
                        isCompleted ? 'bg-green-500/20 text-green-400' :
                        task.status === 'failed' || task.status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        "{task.status}" {task.progress > 0 ? `(${Math.round(task.progress)}%)` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-dark-400">
                <p><strong>Completed Tasks Count:</strong> {completedTasks.length}</p>
                <p><strong>All Tasks Count:</strong> {processingTasks.length}</p>
              </div>
            </div>
          )}
        </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {/* Processing status */}
        <div className="space-y-4">
          {/* Running jobs */}
          <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-blue-400">
                Currently Running
              </h3>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                {runningTasks.length} jobs
              </span>
            </div>
            
            {runningTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-dark-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-dark-300">
                  No jobs currently running
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {runningTasks.map((task) => (
                  <div key={task.id} className="bg-dark-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-dark-100 font-medium">{task.task_name || 'Untitled Task'}</h4>
                        <p className="text-dark-400 text-xs">Task ID: {task.id.slice(0, 8)}</p>
                        <p className="text-dark-400 text-sm">
                          {task.file_count} files • Started {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                        {task.status === 'TaskStatus.RUNNING' ? 'Running' : 
                         task.status === 'RUNNING' ? 'Running' : 
                         task.status === 'processing' ? 'Processing' : 
                         task.status}
                      </span>
                    </div>
                    
                    <div className="w-full bg-dark-500 rounded-full h-2 mb-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-dark-400 text-xs">
                      {Math.round(task.progress)}% complete
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queued jobs */}
          <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-yellow-400">
                Queued Jobs
              </h3>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                {queuedTasks.length} jobs
              </span>
            </div>
            
            {queuedTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-dark-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-dark-300">
                  No jobs in queue
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {queuedTasks.map((task) => (
                  <div key={task.id} className="bg-dark-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-dark-100 font-medium">{task.task_name || 'Untitled Task'}</h4>
                        <p className="text-dark-400 text-xs">Task ID: {task.id.slice(0, 8)}</p>
                        <p className="text-dark-400 text-sm">
                          {task.file_count} files • Queued {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                        {task.status === 'TaskStatus.QUEUED' ? 'Queued' : task.status}
                      </span>
                    </div>
                    
                    <div className="text-dark-400 text-xs">
                      <p>Waiting for processing to start...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Completed jobs */}
          <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-green-400">
                Completed Jobs
              </h3>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                {completedTasks.length} jobs
              </span>
            </div>
            
            {completedTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-dark-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-dark-300">
                  No completed jobs yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="bg-dark-600 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-dark-100 font-medium">{task.task_name || 'Untitled Task'}</h4>
                        <p className="text-dark-400 text-xs">Task ID: {task.id.slice(0, 8)}</p>
                        <p className="text-dark-400 text-sm">
                          {task.file_count} files • Completed {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                          completed
                        </span>
                        <button
                          onClick={() => downloadProcessedFiles(task)}
                          className="px-3 py-1 bg-primary-500 text-white text-xs rounded hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {completedTasks.length > 5 && (
                  <p className="text-dark-400 text-sm text-center">
                    And {completedTasks.length - 5} more completed jobs...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Failed jobs */}
          {failedTasks.length > 0 && (
            <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-red-400">
                  Failed Jobs
                </h3>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                  {failedTasks.length} jobs
                </span>
              </div>
              
              <div className="space-y-3">
                {failedTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="bg-dark-600 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-dark-100 font-medium">Task {task.id.slice(0, 8)}</h4>
                        <p className="text-dark-400 text-sm">
                          {task.file_count} files • Failed {new Date(task.created_at).toLocaleString()}
                        </p>
                        {task.error && (
                          <p className="text-red-400 text-xs mt-1">{task.error}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                        failed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Processing settings */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-medium text-primary-400 mb-4">
          Processing Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Image Overlap
            </label>
            <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:outline-none">
              <option>60% (Recommended)</option>
              <option>70%</option>
              <option>80%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Output Quality
            </label>
            <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:outline-none">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;
