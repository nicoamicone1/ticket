import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet, useLocation } from 'react-router';
import './layout.css';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Determine page title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/spaces')) return 'Espacios de Trabajo';
    if (path.startsWith('/notifications')) return 'Notificaciones';
    if (path.startsWith('/tickets')) return 'Detalle de Ticket';
    return 'Ticket';
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="app-main">
        <Header onMenuToggle={() => setSidebarOpen(true)} title={getPageTitle()} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
