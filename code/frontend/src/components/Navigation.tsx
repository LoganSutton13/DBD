import React from 'react';

interface NavigationProps {
  activeTab: 'upload' | 'gallery';
  onTabChange: (tab: 'upload' | 'gallery') => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bg-dark-800 border-b border-dark-700 mb-8">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          <button
            onClick={() => onTabChange('upload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'upload'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-dark-300 hover:text-dark-100 hover:border-dark-600'
            }`}
          >
            Upload Images
          </button>
          <button
            onClick={() => onTabChange('gallery')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'gallery'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-dark-300 hover:text-dark-100 hover:border-dark-600'
            }`}
          >
            View Gallery
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
