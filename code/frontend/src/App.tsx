import React, { useState } from 'react';
import './App.css';
import Navigation from './components/Navigation';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary-500 mb-2">
            Drone Imagery Hub
          </h1>
          <p className="text-dark-300 text-lg">
            Upload, process, and view your drone imagery
          </p>
        </header>
        
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main>
          {activeTab === 'upload' ? <UploadView /> : <GalleryView />}
        </main>
      </div>
    </div>
  );
}

export default App;
