import React from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, FolderKanban, Bell, LogOut, Briefcase, User } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import './layout.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    if (window.confirm('¿Seguro que querés cerrar sesión?')) {
      await signOut();
    }
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/spaces', label: 'Espacios', icon: <FolderKanban size={18} /> },
    { to: '/notifications', label: 'Notificaciones', icon: <Bell size={18} />, badge: true }
  ];

  return (
    <>
      {/* Overlay to close sidebar on mobile click */}
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="bold text-xl" style={{ letterSpacing: '-0.02em' }}>
            Ticket<span style={{ color: 'var(--color-primary)' }}>.</span>
          </h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
            >
              <div className="flex align-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && unreadCount > 0 && (
                <span style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-white)',
                  fontSize: '10px',
                  fontWeight: 'var(--font-bold)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {profile && (
            <div className="user-profile-info">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-gray-900)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'var(--font-bold)',
                border: '1px solid var(--color-gray-800)'
              }}>
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              <div className="flex-1 truncate" style={{ minWidth: 0 }}>
                <p className="semibold text-sm truncate" style={{ color: 'var(--color-white)' }}>{profile.full_name}</p>
                <span className="flex align-center gap-1 text-xs text-muted" style={{ textTransform: 'capitalize' }}>
                  {profile.role === 'programador' ? <Briefcase size={12} /> : <User size={12} />}
                  {profile.role}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
