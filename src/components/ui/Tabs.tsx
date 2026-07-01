import React from 'react';
import './ui.css';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange
}) => {
  return (
    <div className="tabs-list">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-trigger ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
