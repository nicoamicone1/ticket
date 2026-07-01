import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { useNotifications } from '@/contexts/NotificationContext';
import './layout.css';

interface HeaderProps {
  onMenuToggle: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, title }) => {
  const { unreadCount } = useNotifications();

  return (
    <header className="app-header">
      <div className="flex align-center gap-3">
        <button
          className="menu-toggle-btn"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <h1 className="semibold text-lg" style={{ color: 'var(--color-black)' }}>
          {title}
        </h1>
      </div>

      <div className="flex align-center gap-4">
        <Link
          to="/notifications"
          style={{
            position: 'relative',
            color: 'var(--color-text-muted)',
            padding: '6px',
            borderRadius: 'var(--radius-full)',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="btn-ghost"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              border: '2px solid var(--color-white)'
            }} />
          )}
        </Link>
      </div>
    </header>
  );
};
