import React, { useState } from 'react';
import type { Ticket, TicketStatus } from '@/lib/types';
import { TicketCard } from './TicketCard';
import { ClipboardList, Calculator, CheckCircle2, Play, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import '@/components/ui/ui.css';

interface KanbanBoardProps {
  tickets: Ticket[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tickets }) => {
  const [collapsedColumns, setCollapsedColumns] = useState<Record<TicketStatus, boolean>>({
    pendiente: false,
    estimado: false,
    aprobado: false,
    rechazado: false,
    en_progreso: false,
    resuelto: true // Cerrada por defecto inicialmente
  });

  const columns: { id: TicketStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'pendiente', label: 'Pendientes', icon: <ClipboardList size={16} />, color: 'var(--color-gray-600)' },
    { id: 'estimado', label: 'Estimados / Rechazados', icon: <Calculator size={16} />, color: 'var(--color-warning)' },
    { id: 'aprobado', label: 'Aprobados', icon: <CheckCircle2 size={16} />, color: 'var(--color-info)' },
    { id: 'en_progreso', label: 'En Progreso', icon: <Play size={16} />, color: 'var(--color-primary)' },
    { id: 'resuelto', label: 'Resueltos', icon: <Check size={16} />, color: 'var(--color-success)' }
  ];

  const toggleColumn = (status: TicketStatus) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const getTicketsByStatus = (status: TicketStatus) => {
    // Si la columna es 'estimado', también podemos incluir 'rechazado'
    if (status === 'estimado') {
      return tickets.filter(t => t.status === 'estimado' || t.status === 'rechazado');
    }
    return tickets.filter(t => t.status === status);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: columns.map(col =>
        collapsedColumns[col.id] ? '50px' : 'minmax(240px, 1fr)'
      ).join(' '),
      gap: '16px',
      overflowX: 'auto',
      paddingBottom: '16px',
      alignItems: 'start'
    }}>
      {columns.map((col) => {
        const colTickets = getTicketsByStatus(col.id);
        const isCollapsed = collapsedColumns[col.id];

        if (isCollapsed) {
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => toggleColumn(col.id)}
              className="kanban-column-collapsed"
              style={{ borderTop: `4px solid ${col.color}` }}
              aria-expanded={false}
              aria-label={`Expandir columna ${col.label} (${colTickets.length} tickets)`}
              title={`Expandir columna: ${col.label}`}
            >
              <span className="kanban-toggle-btn" aria-hidden="true">
                <ChevronRight size={16} />
              </span>

              <span style={{ color: col.color, display: 'flex', justifyContent: 'center' }} aria-hidden="true">
                {col.icon}
              </span>

              <span className="kanban-count-pill">
                {colTickets.length}
              </span>

              <span style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                whiteSpace: 'nowrap',
                color: 'var(--color-gray-600)',
                fontWeight: 'var(--font-semibold)',
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.05em',
                marginTop: '8px'
              }}>
                {col.label}
              </span>
            </button>
          );
        }

        return (
          <div key={col.id} className="kanban-column">
            {/* Header columna */}
            <div className="flex align-center justify-between" style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: '8px' }}>
              <div className="flex align-center gap-2" style={{ color: 'var(--color-black)' }}>
                {col.icon}
                <span className="semibold text-sm">{col.label}</span>
              </div>
              <div className="flex align-center gap-2">
                <span className="kanban-count-pill">
                  {colTickets.length}
                </span>
                <button
                  type="button"
                  onClick={() => toggleColumn(col.id)}
                  className="kanban-toggle-btn"
                  aria-expanded={true}
                  aria-label={`Colapsar columna ${col.label}`}
                  title="Colapsar columna"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            {/* Lista de cards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              maxHeight: '600px'
            }}>
              {colTickets.length === 0 ? (
                <div className="kanban-empty">
                  No hay tickets
                </div>
              ) : (
                colTickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
