import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // El llamador es responsable de mostrar el error (toast);
      // el modal queda abierto para reintentar.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} disableClose={isSubmitting}>
      <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
        {message}
      </p>
      <div className="flex justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={variant} isLoading={isSubmitting} onClick={handleConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
