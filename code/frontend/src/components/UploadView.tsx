import React from 'react';

const UploadView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <h2 className="text-2xl font-semibold text-primary-400 mb-4">
          Upload Drone Images
        </h2>
        <p className="text-dark-300 mb-6">
          Drag and drop your drone images here or click to browse. 
          Supported formats: JPEG, PNG, TIFF
        </p>
        
        {/* Upload area placeholder */}
        <div className="border-2 border-dashed border-dark-600 rounded-lg p-12 text-center hover:border-primary-500 transition-colors duration-200">
          <div className="text-dark-400 mb-4">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-dark-300 text-lg">
            Drop your drone images here
          </p>
          <p className="text-dark-400 text-sm mt-2">
            or click to browse files
          </p>
        </div>
      </div>
      
      {/* Upload progress placeholder */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-medium text-primary-400 mb-3">
          Upload Queue
        </h3>
        <p className="text-dark-400 text-sm">
          No files in queue
        </p>
      </div>
    </div>
  );
};

export default UploadView;
