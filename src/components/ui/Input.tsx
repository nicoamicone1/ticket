import React, { forwardRef } from 'react';
import './ui.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-gray-400)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-control ${className}`}
          style={icon ? { paddingLeft: '38px' } : undefined}
          {...props}
        />
      </div>
      {error && <span className="form-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
