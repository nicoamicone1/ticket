import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hours: number) => Promise<void>;
}

export const EstimateModal: React.FC<EstimateModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [hours, setHours] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear el formulario cada vez que se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setHours('');
      setValidationError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = Number(hours);
    if (!Number.isInteger(parsedHours) || parsedHours <= 0) {
      setValidationError('Ingresá una cantidad entera de horas mayor a cero.');
      return;
    }
    setValidationError('');

    setIsSubmitting(true);
    try {
      await onConfirm(parsedHours);
      onClose();
    } catch (err) {
      // El padre ya mostró el error (toast); el modal queda abierto para reintentar
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Estimar Horas del Ticket" disableClose={isSubmitting}>
      <form onSubmit={handleSubmit}>
        <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
          Estimá la cantidad de horas necesarias para completar este requerimiento. El cliente deberá aprobar esta estimación para comenzar a trabajar.
        </p>
        <Input
          label="Horas estimadas"
          type="number"
          placeholder="Ej. 12"
          min="1"
          step="1"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          error={validationError}
          required
          autoFocus
        />
        <div className="flex justify-between gap-3" style={{ marginTop: '24px' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Enviar Estimación
          </Button>
        </div>
      </form>
    </Modal>
  );
};
