import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';
import ProcessingView from './components/ProcessingView';
import FieldMapsView from './components/FieldMapsView';
import PesticidePrescriptionsView from './components/PesticidePrescriptionsView';

const noopStats = { imagesUploaded: 0, processing: 0, completed: 0 };
const noopUpdate = () => {};

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'processing' | 'fieldmaps' | 'pesticides'>('upload');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadView onStatsUpdate={noopUpdate} currentStats={noopStats} />;
      case 'gallery':
        return <GalleryView />;
      case 'processing':
        return <ProcessingView />;
      case 'fieldmaps':
        return <FieldMapsView />;
      case 'pesticides':
        return <PesticidePrescriptionsView />;
      default:
        return <UploadView onStatsUpdate={noopUpdate} currentStats={noopStats} />;
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
