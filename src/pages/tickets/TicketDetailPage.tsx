import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import type { Ticket, TicketAttachment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/hooks/useTickets';
import { useToast } from '@/contexts/ToastContext';
import { copyToClipboard, getErrorMessage } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EstimateModal } from '@/components/tickets/EstimateModal';
import { RejectModal } from '@/components/tickets/RejectModal';
import { CommentSection } from '@/components/tickets/CommentSection';
import { ActivityTimeline } from '@/components/tickets/ActivityTimeline';
import { ArrowLeft, Calendar, AlertCircle, Play, CheckCircle, Calculator, Ban, FileText, Share2 } from 'lucide-react';

/** Resuelve las URLs de los adjuntos: los paths del bucket privado se firman temporalmente */
const resolveAttachmentUrls = async (attachments: TicketAttachment[]): Promise<TicketAttachment[]> => {
  const pathAttachments = attachments.filter((a) => !/^https?:\/\//.test(a.file_url));
  if (pathAttachments.length === 0) return attachments;

  const { data: signed, error } = await supabase.storage
    .from('attachments')
    .createSignedUrls(pathAttachments.map((a) => a.file_url), 3600);

  if (error || !signed) {
    console.error('Error firmando URLs de adjuntos:', error);
    return attachments;
  }

  const urlByPath = new Map(signed.map((s, i) => [pathAttachments[i].file_url, s.signedUrl]));
  return attachments.map((a) =>
    urlByPath.get(a.file_url) ? { ...a, file_url: urlByPath.get(a.file_url)! } : a
  );
};

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const toast = useToast();
  const { estimateTicket, approveTicket, rejectTicket, startTicket, resolveTicket, isMutating } = useTickets();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const loadTicketData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(false);
    try {
      // 1. Obtener datos del ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          creator:created_by (id, full_name, email, avatar_url),
          space:space_id (id, name, client_id, programmer_id)
        `)
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData as Ticket);

      // 2. Obtener adjuntos (con URLs firmadas para el bucket privado)
      const { data: attachData, error: attachError } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', id);

      if (attachError) throw attachError;
      setAttachments(await resolveAttachmentUrls(attachData as TicketAttachment[]));
    } catch (err) {
      console.error(err);
      setLoadError(true);
      toastRef.current.error('Error al cargar datos del ticket');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  const handleEstimate = async (hours: number) => {
    if (!id) return;
    try {
      await estimateTicket(id, hours);
      toast.success('¡Estimación enviada!');
      await loadTicketData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al enviar estimación'));
      throw err; // mantiene el modal abierto para reintentar
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveTicket(id);
      toast.success('¡Horas aprobadas! El programador ya puede trabajar en el ticket.');
      await loadTicketData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al aprobar horas'));
      throw err;
    }
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    try {
      await rejectTicket(id, reason);
      toast.success('Estimación rechazada.');
      await loadTicketData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al rechazar estimación'));
      throw err; // mantiene el modal abierto y conserva el motivo escrito
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await startTicket(id);
      toast.success('Ticket marcado en progreso.');
      await loadTicketData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al iniciar resolución'));
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await resolveTicket(id);
      toast.success('¡Ticket resuelto!');
      await loadTicketData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al resolver ticket'));
      throw err;
    }
  };

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(window.location.href);
    if (copied) {
      toast.success('¡Enlace de aprobación copiado al portapapeles!');
    } else {
      toast.error('No se pudo copiar el enlace. Copialo desde la barra de direcciones.');
    }
  };

  if (isLoading) {
    return <Spinner centered />;
  }

  if (!ticket) {
    return (
      <Card style={{ padding: '32px', textAlign: 'center' }}>
        <h3 className="semibold text-lg" style={{ color: 'var(--color-error)' }}>
          {loadError ? 'No se pudo cargar el ticket' : 'Ticket no encontrado'}
        </h3>
        {loadError && (
          <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
            Revisá tu conexión e intentá de nuevo.
          </p>
        )}
        <div className="flex justify-center gap-3" style={{ marginTop: '16px' }}>
          {loadError && (
            <Button variant="primary" onClick={loadTicketData}>Reintentar</Button>
          )}
          <Link to="/spaces" className="btn btn-secondary">Volver a Espacios</Link>
        </div>
      </Card>
    );
  }

  const isClient = profile?.role === 'cliente';
  const isProgrammer = profile?.role === 'programador';

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'resuelto': return 'success';
      case 'aprobado': return 'info';
      case 'en_progreso': return 'info';
      case 'estimado': return 'warning';
      case 'rechazado': return 'error';
      case 'pendiente':
      default:
        return 'warning';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Botón Volver */}
      <div>
        <Link to={`/spaces/${ticket.space_id}`} className="flex align-center gap-1 text-xs text-muted" style={{ fontWeight: 'var(--font-medium)' }}>
          <ArrowLeft size={14} /> Volver al Espacio
        </Link>
      </div>

      {/* Grid Principal */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Lado Izquierdo: Contenido del Ticket, Archivos, Comentarios */}
        <div className="flex flex-col gap-6">
          <Card style={{ padding: '32px' }}>
            {/* Header info */}
            <div className="flex justify-between align-center flex-wrap gap-3" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
              <div className="flex align-center gap-3">
                <Badge variant={getStatusBadgeVariant(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
                <Badge variant={`priority-${ticket.priority}`}>
                  Prioridad {ticket.priority}
                </Badge>
              </div>
              <span className="text-xs text-muted flex align-center gap-1">
                <Calendar size={12} />
                Creado {new Date(ticket.created_at).toLocaleDateString('es-AR')}
              </span>
            </div>

            {/* Título y descripción */}
            <h2 className="bold text-2xl" style={{ color: 'var(--color-black)', marginBottom: '8px' }}>
              {ticket.title}
            </h2>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {ticket.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 'var(--font-bold)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      backgroundColor: 'var(--color-gray-100)',
                      color: 'var(--color-gray-600)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p style={{ whiteSpace: 'pre-line', fontSize: 'var(--text-sm)', color: 'var(--color-black)', lineHeight: '1.6' }}>
              {ticket.description}
            </p>

            {/* Archivos adjuntos */}
            {attachments.length > 0 && (
              <div style={{ marginTop: '32px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                <h4 className="semibold text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Archivos Adjuntos ({attachments.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {attachments.map((file) => {
                    const isImg = file.file_type.startsWith('image/');
                    return (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                          backgroundColor: 'var(--color-bg)',
                          maxWidth: '280px',
                          overflow: 'hidden'
                        }}
                      >
                        {isImg ? (
                          <img src={file.file_url} alt={file.file_name} style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <FileText size={18} className="text-muted" />
                        )}
                        <span className="truncate semibold" style={{ color: 'var(--color-black)' }}>{file.file_name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Comentarios */}
          <Card style={{ padding: '32px' }}>
            <CommentSection ticketId={ticket.id} />
          </Card>
        </div>

        {/* Lado Derecho: Estado, Horas, Acciones, Historial */}
        <div className="flex flex-col gap-6">
          {/* Panel de Control de Estado */}
          <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="semibold text-base" style={{ color: 'var(--color-black)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              Control de Ticket
            </h3>

            {/* Mostrar horas estimadas */}
            {ticket.estimated_hours && (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
                <span className="text-muted text-xs semibold">TIEMPO ESTIMADO</span>
                <h3 className="bold text-3xl" style={{ color: 'var(--color-primary)', marginTop: '4px' }}>
                  {ticket.estimated_hours}h
                </h3>
              </div>
            )}

            {/* Mostrar razón de rechazo si aplica */}
            {ticket.status === 'rechazado' && ticket.rejection_reason && (
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
                <span className="bold flex align-center gap-1" style={{ marginBottom: '4px' }}>
                  <AlertCircle size={14} /> Estimación Rechazada
                </span>
                "{ticket.rejection_reason}"
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-3">
              {/* Programador: Estimar */}
              {isProgrammer && (ticket.status === 'pendiente' || ticket.status === 'rechazado') && (
                <Button variant="primary" fullWidth onClick={() => setIsEstimateOpen(true)} disabled={isMutating} icon={<Calculator size={16} />}>
                  Estimar Horas
                </Button>
              )}

              {/* Compartir enlace de aprobación (cuando está estimado) */}
              {ticket.status === 'estimado' && (
                <Button variant="secondary" fullWidth onClick={handleCopyLink} icon={<Share2 size={16} />}>
                  Compartir enlace de aprobación
                </Button>
              )}

              {/* Cliente o Programador (si aprobó por fuera): Aprobar / Rechazar */}
              {ticket.status === 'estimado' && (
                <>
                  <Button variant="primary" fullWidth onClick={() => setIsApproveOpen(true)} disabled={isMutating} icon={<CheckCircle size={16} />}>
                    {isProgrammer ? 'Aprobar Horas (Confirmado por chat)' : 'Aprobar Horas'}
                  </Button>
                  <Button variant="danger" fullWidth onClick={() => setIsRejectOpen(true)} disabled={isMutating} icon={<Ban size={16} />}>
                    {isProgrammer ? 'Rechazar (Confirmado por chat)' : 'Rechazar'}
                  </Button>
                </>
              )}

              {/* Programador: Comenzar */}
              {isProgrammer && ticket.status === 'aprobado' && (
                <Button variant="primary" fullWidth onClick={handleStart} isLoading={isMutating} icon={<Play size={16} />}>
                  Comenzar Trabajo
                </Button>
              )}

              {/* Programador: Completar */}
              {isProgrammer && ticket.status === 'en_progreso' && (
                <Button variant="primary" fullWidth onClick={() => setIsResolveOpen(true)} disabled={isMutating} icon={<CheckCircle size={16} />}>
                  Marcar como Resuelto
                </Button>
              )}

              {/* Si no hay acciones */}
              {ticket.status === 'resuelto' && (
                <div style={{ textAlign: 'center', color: 'var(--color-success)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                  ✓ El ticket ha sido resuelto.
                </div>
              )}

              {isClient && ticket.status === 'pendiente' && (
                <div className="text-muted text-xs text-center">
                  Esperando que el programador estime las horas.
                </div>
              )}
            </div>
          </Card>

          {/* Historial de Actividad */}
          <Card style={{ padding: '24px' }}>
            <ActivityTimeline ticketId={ticket.id} refreshToken={ticket.updated_at} />
          </Card>
        </div>

      </div>

      {/* Modales */}
      <EstimateModal
        isOpen={isEstimateOpen}
        onClose={() => setIsEstimateOpen(false)}
        onConfirm={handleEstimate}
      />

      <RejectModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
      />

      <ConfirmModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApprove}
        title="Aprobar Horas"
        message={`¿Seguro que querés aprobar la estimación de ${ticket.estimated_hours ?? '?'} horas? El programador podrá comenzar a trabajar.`}
        confirmLabel="Aprobar Horas"
      />

      <ConfirmModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        onConfirm={handleResolve}
        title="Marcar como Resuelto"
        message="¿Seguro que completaste el trabajo? El cliente será notificado."
        confirmLabel="Marcar Resuelto"
      />

    </div>
  );
};
