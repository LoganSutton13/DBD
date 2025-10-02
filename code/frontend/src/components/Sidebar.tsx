import React from 'react';

interface SidebarProps {
  activeTab: 'upload' | 'gallery' | 'processing';
  onTabChange: (tab: 'upload' | 'gallery' | 'processing') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
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
              <span className="text-primary-400 font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Processing</span>
              <span className="text-yellow-400 font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Completed</span>
              <span className="text-green-400 font-medium">0</span>
            </div>
          </div>
        </div>
        
        {/* Storage Info */}
        <div className="mt-6 pt-6 border-t border-dark-700">
          <h3 className="text-sm font-medium text-dark-400 mb-3">Storage</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-dark-300 text-sm">Used</span>
              <span className="text-dark-300 text-sm">0 MB</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
