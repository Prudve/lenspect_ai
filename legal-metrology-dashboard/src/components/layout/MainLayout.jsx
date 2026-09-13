import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './MainLayout.css';

function MainLayout({ currentSection, onSelectSection, sectionMeta, children }) {
  return (
    <div className="app-layout">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        currentSection={currentSection} 
        onSelectSection={onSelectSection} 
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* 2. Top Header */}
        <Header 
          title={sectionMeta.title} 
          subtitle={sectionMeta.subtitle} 
        />

        {/* 3. Main Content Viewport */}
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
