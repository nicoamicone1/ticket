import React from 'react';
import './ui.css';

interface SpinnerProps {
  size?: number;
  /** Envuelve el spinner en un contenedor centrado con padding */
  centered?: boolean;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 32, centered = false, label = 'Cargando...' }) => {
  const spinner = (
    <div
      className="spinner"
      role="status"
      aria-label={label}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );

  if (!centered) return spinner;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
      {spinner}
    </div>
  );
};
