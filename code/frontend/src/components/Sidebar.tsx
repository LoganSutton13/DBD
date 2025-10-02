import React from 'react';

interface AppStats {
  imagesUploaded: number;
  processing: number;
  completed: number;
  storageUsed: number;
}

interface SidebarProps {
  activeTab: 'upload' | 'gallery' | 'processing' | 'fieldmaps';
  onTabChange: (tab: 'upload' | 'gallery' | 'processing' | 'fieldmaps') => void;
  stats: AppStats;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, stats }) => {
  const menuItems = [
    {
      id: 'upload' as const,
      label: 'Upload Images',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )
    },
    {
      id: 'processing' as const,
      label: 'Processing Queue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    {
      id: 'gallery' as const,
      label: 'View Gallery',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'fieldmaps' as const,
      label: 'Field Maps',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    }
  ];

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-700 min-h-screen">
      <nav className="p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Quick Stats */}
        <div className="mt-8 pt-6 border-t border-dark-700">
          <h3 className="text-sm font-medium text-dark-400 mb-3">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Images Uploaded</span>
              <span className="text-primary-400 font-medium">{stats.imagesUploaded}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Processing</span>
              <span className="text-yellow-400 font-medium">{stats.processing}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Completed</span>
              <span className="text-green-400 font-medium">{stats.completed}</span>
            </div>
          </div>
        </div>
        
        {/* Storage Info */}
        <div className="mt-6 pt-6 border-t border-dark-700">
          <h3 className="text-sm font-medium text-dark-400 mb-3">Storage</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Used</span>
              <span className="text-dark-300 text-sm">{stats.storageUsed.toFixed(1)} MB</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((stats.storageUsed / 1000) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-dark-400">
              {stats.storageUsed.toFixed(1)} MB of 1 GB used
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
