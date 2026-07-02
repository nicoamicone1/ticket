import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear el formulario cada vez que se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setValidationError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setValidationError('Ingresá el motivo del rechazo.');
      return;
    }
    setValidationError('');

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      // El padre ya mostró el error (toast); el modal queda abierto y conserva el motivo
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rechazar Estimación de Horas" disableClose={isSubmitting}>
      <form onSubmit={handleSubmit}>
        <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
          Explicá al programador el motivo del rechazo. Esto le permitirá re-estimar las horas de acuerdo a tus comentarios.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="reject-reason">Motivo de rechazo</label>
          <textarea
            id="reject-reason"
            className="form-control"
            rows={4}
            placeholder="Ej. Me parece excesivo para el requerimiento, podríamos dividirlo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            autoFocus
            style={{ resize: 'vertical' }}
          />
          {validationError && <span className="form-error-msg">{validationError}</span>}
        </div>
        <div className="flex justify-between gap-3" style={{ marginTop: '24px' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting}>
            Rechazar Estimación
          </Button>
        </div>
      </form>
    </Modal>
  );
};
