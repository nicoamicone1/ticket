import React, { useEffect } from 'react';
import { useTicketActivity } from '@/hooks/useTicketActivity';
import type { TicketActivityMetadata } from '@/lib/types';
import { PlusCircle, Clock, CheckCircle2, AlertTriangle, PlayCircle, Trophy, MessageSquare } from 'lucide-react';

interface ActivityTimelineProps {
  ticketId: string;
  /** Cambiar este valor (p. ej. updated_at del ticket) re-carga el historial */
  refreshToken?: string | number;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ ticketId, refreshToken }) => {
  const { activities, isLoading, fetchActivities } = useTicketActivity(ticketId);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, refreshToken]);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <PlusCircle size={16} color="var(--color-primary)" />;
      case 'estimated':
        return <Clock size={16} color="var(--color-warning)" />;
      case 'approved':
        return <CheckCircle2 size={16} color="var(--color-success)" />;
      case 'rejected':
        return <AlertTriangle size={16} color="var(--color-error)" />;
      case 'started':
        return <PlayCircle size={16} color="var(--color-info)" />;
      case 'resolved':
        return <Trophy size={16} color="var(--color-success)" />;
      case 'commented':
      default:
        return <MessageSquare size={16} color="var(--color-gray-500)" />;
    }
  };

  const formatActionText = (action: string, metadata: TicketActivityMetadata | null, actorName: string) => {
    switch (action) {
      case 'created':
        return `${actorName} creó este ticket.`;
      case 'estimated':
        return `${actorName} estimó el ticket en ${metadata?.estimated_hours || 0} horas.`;
      case 'approved':
        return `${actorName} aprobó la estimación de horas.`;
      case 'rejected':
        return `${actorName} rechazó la estimación. Motivo: "${metadata?.rejection_reason || 'Sin especificar'}"`;
      case 'started':
        return `${actorName} inició la resolución del ticket.`;
      case 'resolved':
        return `${actorName} marcó el ticket como RESUELTO.`;
      case 'commented':
      default:
        return `${actorName} agregó un comentario.`;
    }
  };

  if (isLoading && activities.length === 0) {
    return <p className="text-muted text-xs">Cargando historial...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 className="semibold text-base" style={{ color: 'var(--color-black)' }}>Historial de Actividad</h3>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        paddingLeft: '24px',
        borderLeft: '1px solid var(--color-border)',
        gap: '24px',
        marginLeft: '8px'
      }}>
        {activities.map((act) => (
          <div key={act.id} style={{ position: 'relative' }}>
            {/* Ícono de la línea de tiempo */}
            <div style={{
              position: 'absolute',
              left: '-33px',
              top: '2px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '50%',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {getActivityIcon(act.action)}
            </div>

            {/* Contenido */}
            <div className="flex flex-col">
              <span className="semibold text-sm" style={{ color: 'var(--color-black)' }}>
                {formatActionText(act.action, act.metadata, act.actor?.full_name || 'Alguien')}
              </span>
              <span className="text-muted" style={{ fontSize: 'var(--text-2xs)', marginTop: '2px' }}>
                {new Date(act.created_at).toLocaleDateString('es-AR')} a las {new Date(act.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
