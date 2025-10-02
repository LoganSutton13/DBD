import React from 'react';

const ProcessingView: React.FC = () => {
  // TODO: IMPLEMENT REAL PROCESSING QUEUE
  // This component shows placeholder data - replace with real backend integration
  
  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <h2 className="text-2xl font-semibold text-primary-400 mb-4">
          Processing Queue
        </h2>
        <p className="text-dark-300 mb-6">
          Monitor your image stitching and processing jobs
        </p>
        
        {/* TODO: BACKEND INTEGRATION NEEDED
        Replace this static content with real processing queue data:
        
        useEffect(() => {
          const fetchProcessingQueue = async () => {
            try {
              const response = await fetch('/api/processing/queue');
              const data = await response.json();
              setProcessingJobs(data);
            } catch (error) {
              console.error('Failed to fetch processing queue:', error);
            }
          };
          
          // Poll for updates every 5 seconds
          fetchProcessingQueue();
          const interval = setInterval(fetchProcessingQueue, 5000);
          return () => clearInterval(interval);
        }, []);
        */}
        
        {/* Processing status */}
        <div className="space-y-4">
          {/* Active processing */}
          <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-primary-400">
                Active Processing
              </h3>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                0 jobs
              </span>
            </div>
            <div className="text-center py-8">
              <div className="text-dark-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-dark-300">
                No active processing jobs
              </p>
            </div>
          </div>
          
          {/* Completed jobs */}
          <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-green-400">
                Completed Jobs
              </h3>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                0 jobs
              </span>
            </div>
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
          </div>
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
