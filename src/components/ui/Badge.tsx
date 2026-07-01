import React from 'react';
import './ui.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  icon,
  className = ''
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {icon && <span className="flex align-center">{icon}</span>}
      {children}
    </span>
  );
};
