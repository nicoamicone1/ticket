import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import '@/components/ui/ui.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Limpiar timeouts pendientes al desmontar
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    const timeout = setTimeout(() => {
      timeoutsRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    timeoutsRef.current.set(id, timeout);
  }, []);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);

  // Valor memoizado: sin esto, cada toast re-renderiza a todos los consumidores
  // y re-dispara efectos que dependen de `toast` (p. ej. suscripciones Realtime)
  const value = useMemo(
    () => ({ showToast, success, error, info, warning }),
    [showToast, success, error, info, warning]
  );

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="var(--color-success)" />;
      case 'error': return <AlertCircle size={18} color="var(--color-error)" />;
      case 'warning': return <AlertTriangle size={18} color="var(--color-warning)" />;
      case 'info':
      default:
        return <Info size={18} color="var(--color-info)" />;
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {getIcon(toast.type)}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', flex: 1 }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar notificación"
              style={{ color: 'var(--color-gray-500)', display: 'flex', alignSelf: 'start', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
};
