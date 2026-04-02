import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';
import FieldMapsView from './components/FieldMapsView';
import PesticidePrescriptionsView from './components/PesticidePrescriptionsView';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'fieldmaps' | 'pesticides'>('upload');
  const [uploadSettingsOpenTick, setUploadSettingsOpenTick] = useState(0);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadView openSettingsTick={uploadSettingsOpenTick} />;
      case 'gallery':
        return <GalleryView />;
      case 'fieldmaps':
        return <FieldMapsView />;
      case 'pesticides':
        return <PesticidePrescriptionsView />;
      default:
        return <UploadView />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100">
      <Header
        onSettingsClick={() => {
          if (activeTab === 'upload') {
            setUploadSettingsOpenTick((prev) => prev + 1);
          }
        }}
      />
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
