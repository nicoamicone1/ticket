import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useTickets } from '@/hooks/useTickets';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Upload, FileText, X } from 'lucide-react';
import { TagSelector } from '@/components/tickets/TagSelector';
import '@/components/ui/ui.css';

export const CreateTicketPage: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { createTicket, isLoading } = useTickets();
  const { profile } = useAuth();

  const isProgrammer = profile?.role === 'programador';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const priorityOptions = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > 5) {
      toast.error('Solo podés subir hasta 5 archivos por ticket.');
      return;
    }

    // Validar tamaño máximo (10MB)
    const oversizedFiles = newFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Los archivos no deben superar los 10 MB.');
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;

    if (!title.trim() || !description.trim()) {
      toast.error('Por favor, completá el título y la descripción');
      return;
    }

    const hoursVal = estimatedHours.trim() ? parseInt(estimatedHours, 10) : undefined;
    if (hoursVal !== undefined && (isNaN(hoursVal) || hoursVal <= 0)) {
      toast.error('Las horas estimadas deben ser un número positivo.');
      return;
    }

    try {
      await createTicket(spaceId, title, description, priority, files, selectedTags, hoursVal);
      toast.success('¡Ticket creado con éxito!');
      navigate(`/spaces/${spaceId}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el ticket');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px', margin: '0 auto' }}>
      
      <div className="flex flex-col gap-2">
        <Link to={`/spaces/${spaceId}`} className="flex align-center gap-1 text-xs text-muted" style={{ fontWeight: 'var(--font-medium)' }}>
          <ArrowLeft size={14} /> Volver al Espacio
        </Link>
        <h2 className="bold text-2xl" style={{ color: 'var(--color-black)', marginTop: '8px' }}>Crear Nuevo Ticket</h2>
        <p className="text-muted text-sm">Contanos cuál es el problema o requerimiento</p>
      </div>

      <Card style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <Input
            label="Título del ticket"
            placeholder="Ej. Error al procesar el pago con tarjeta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            required
            autoFocus
            style={{ marginBottom: 0 }}
          />

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control"
              rows={6}
              placeholder="Detallá los pasos para reproducir el error o los requerimientos de la tarea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <div style={{ minWidth: '200px', flex: 1 }}>
              <Select
                label="Prioridad"
                options={priorityOptions}
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ marginBottom: 0 }}
              />
            </div>
            {isProgrammer && (
              <div style={{ minWidth: '200px', flex: 1 }}>
                <Input
                  label="Horas estimadas (opcional)"
                  type="number"
                  min="1"
                  placeholder="Ej. 8"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  disabled={isLoading}
                  style={{ marginBottom: 0 }}
                />
              </div>
            )}
          </div>

          <TagSelector
            selectedTags={selectedTags}
            onChange={setSelectedTags}
          />

          {/* Adjuntar archivos */}
          <div className="form-group">
            <label className="form-label">Archivos adjuntos (Max 5 — Límite 10MB por archivo)</label>
            
            <div
              className={`file-dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <div className="flex flex-col align-center gap-2 text-muted">
                <Upload size={24} style={{ color: 'var(--color-primary)' }} />
                <p className="semibold text-sm" style={{ color: 'var(--color-black)' }}>Arrastrá archivos acá o hacé clic para buscar</p>
                <p className="text-xs">Imágenes, PDFs, logs u otros documentos de soporte</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="file-list">
                {files.map((file, idx) => (
                  <div key={idx} className="file-item flex align-center justify-between">
                    <div className="flex align-center gap-2" style={{ overflow: 'hidden' }}>
                      <FileText size={14} className="text-muted" style={{ flexShrink: 0 }} />
                      <span className="truncate">{file.name}</span>
                      <span className="text-muted" style={{ fontSize: '10px', flexShrink: 0 }}>
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} className="file-item-remove" disabled={isLoading}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex justify-between gap-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px', marginTop: '12px' }}>
            <Link to={`/spaces/${spaceId}`} className="btn btn-ghost" style={{ pointerEvents: isLoading ? 'none' : 'auto' }}>
              Cancelar
            </Link>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Crear Ticket
            </Button>
          </div>

        </form>
      </Card>

    </div>
  );
};
