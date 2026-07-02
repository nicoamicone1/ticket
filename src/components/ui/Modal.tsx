import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import './ui.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Bloquea Escape, el click en el fondo y el botón X (p. ej. durante un envío) */
  disableClose?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  disableClose = false
}) => {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const disableCloseRef = useRef(disableClose);
  disableCloseRef.current = disableClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Mover el foco dentro del modal (si ningún hijo lo tomó con autoFocus)
    const content = contentRef.current;
    if (content && !content.contains(document.activeElement)) {
      const firstFocusable = content.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? content).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableCloseRef.current) {
        onClose();
        return;
      }
      // Focus trap: mantener Tab dentro del modal
      if (e.key === 'Tab' && contentRef.current) {
        const focusables = Array.from(
          contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !contentRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !disableClose) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div
        className="modal-content"
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          disabled={disableClose}
          aria-label="Cerrar ventana"
        >
          <X size={18} />
        </button>
        <h3 id={titleId} className="semibold text-lg" style={{ marginBottom: '16px', paddingRight: '24px' }}>
          {title}
        </h3>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};
