import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';
import ProcessingView from './components/ProcessingView';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'processing'>('upload');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadView />;
      case 'gallery':
        return <GalleryView />;
      case 'processing':
        return <ProcessingView />;
      default:
        return <UploadView />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100">
      <Header />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-8">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
