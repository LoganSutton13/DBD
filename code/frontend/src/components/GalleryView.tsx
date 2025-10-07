import React from 'react';

const GalleryView: React.FC = () => {
  // TODO: IMPLEMENT REAL GALLERY WITH BACKEND INTEGRATION
  // This component shows placeholder content - replace with real image gallery
  
  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <h2 className="text-2xl font-semibold text-primary-400 mb-4">
          Image Gallery
        </h2>
        <p className="text-dark-300 mb-6">
          View your uploaded drone images and stitched panoramas
        </p>
        
        {/* TODO: BACKEND INTEGRATION NEEDED
        Replace this empty state with real gallery implementation:
        
        useEffect(() => {
          const fetchGalleryImages = async () => {
            try {
              const response = await fetch('/api/gallery/images');
              const data = await response.json();
              setGalleryImages(data);
            } catch (error) {
              console.error('Failed to fetch gallery images:', error);
            }
          };
          
          fetchGalleryImages();
        }, []);
        */}
        
        {/* Gallery grid placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Empty state */}
          <div className="col-span-full">
            <div className="text-center py-12">
              <div className="text-dark-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-dark-300 text-lg mb-2">
                No images yet
              </p>
              <p className="text-dark-400 text-sm">
                Upload some drone images to get started
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gallery controls placeholder */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-primary-400">
            Gallery Controls
          </h3>
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors duration-200">
              Filter
            </button>
            <button className="px-4 py-2 bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors duration-200">
              Sort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryView;
