import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';
import ProcessingView from './components/ProcessingView';
import FieldMapsView from './components/FieldMapsView';
import PesticidePrescriptionsView from './components/PesticidePrescriptionsView';

interface AppStats {
  imagesUploaded: number;
  processing: number;
  completed: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'processing' | 'fieldmaps' | 'pesticides'>('upload');
  const [stats, setStats] = useState<AppStats>({
    imagesUploaded: 0,
    processing: 0,
    completed: 0,
  });

  const updateStats = (updateFn: (prev: AppStats) => Partial<AppStats>) => {
    setStats(prev => ({ ...prev, ...updateFn(prev) }));
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadView onStatsUpdate={updateStats} currentStats={stats} />;
      case 'gallery':
        return <GalleryView />;
      case 'processing':
        return <ProcessingView />;
      case 'fieldmaps':
        return <FieldMapsView />;
      case 'pesticides':
        return <PesticidePrescriptionsView />;
      default:
        return <UploadView onStatsUpdate={updateStats} currentStats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100">
      <Header />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} stats={stats} />
        <main className="flex-1 p-8">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
