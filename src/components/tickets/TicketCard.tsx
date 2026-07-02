import React from 'react';
import type { Ticket, TicketPriority } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const getPriorityStyle = (priority: TicketPriority) => {
    switch (priority) {
      case 'baja': return 'var(--color-priority-baja)';
      case 'media': return 'var(--color-priority-media)';
      case 'alta': return 'var(--color-priority-alta)';
      case 'urgente':
      default:
        return 'var(--color-priority-urgente)';
    }
  };

  return (
    <Link to={`/tickets/${ticket.id}`} style={{ display: 'block' }}>
      <Card hoverable style={{ padding: '16px', borderLeft: `4px solid ${getPriorityStyle(ticket.priority)}` }}>
        <div className="flex flex-col gap-3">
          {/* Prioridad y horas estimadas */}
          <div className="flex justify-between align-center">
            <Badge variant={`priority-${ticket.priority}`}>
              {ticket.priority}
            </Badge>
            {ticket.estimated_hours && (
              <span className="flex align-center gap-1 text-xs semibold" style={{ color: 'var(--color-primary)' }}>
                <Clock size={12} />
                {ticket.estimated_hours}h
              </span>
            )}
          </div>

          {/* Título */}
          <h4 className="semibold text-sm" style={{ color: 'var(--color-black)', lineHeight: 1.3 }}>
            {ticket.title}
          </h4>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '-4px' }}>
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
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Timestamp e info */}
          <div className="flex align-center justify-between text-xs text-muted" style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: '10px', marginTop: '4px' }}>
            <span className="flex align-center gap-1">
              <Calendar size={12} />
              {new Date(ticket.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </span>
            {ticket.status === 'rechazado' && (
              <span className="flex align-center gap-1 semibold" style={{ color: 'var(--color-error)' }}>
                <AlertCircle size={12} />
                Rechazado
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};
