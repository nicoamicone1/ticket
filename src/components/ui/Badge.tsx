import React from 'react';
import './ui.css';

export type BadgeVariant =
  | 'success' | 'warning' | 'error' | 'info'
  | 'priority-baja' | 'priority-media' | 'priority-alta' | 'priority-urgente';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
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
