import React, { useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Por favor, ingresá una razón para rechazar la estimación.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      onClose();
      setReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rechazar Estimación de Horas">
      <form onSubmit={handleSubmit}>
        <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
          Explicá al programador el motivo del rechazo. Esto le permitirá re-estimar las horas de acuerdo a tus comentarios.
        </p>
        <div className="form-group">
          <label className="form-label">Motivo de rechazo</label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Ej. Me parece excesivo para el requerimiento, podríamos dividirlo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            autoFocus
            style={{ resize: 'vertical' }}
          />
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
