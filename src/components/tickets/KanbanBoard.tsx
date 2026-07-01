import React, { useState } from 'react';
import type { Ticket, TicketStatus } from '@/lib/types';
import { TicketCard } from './TicketCard';
import { ClipboardList, Calculator, CheckCircle2, Play, Check, ChevronLeft, ChevronRight } from 'lucide-react';

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
      alignItems: 'start',
      transition: 'grid-template-columns 0.3s ease'
    }}>
      {columns.map((col) => {
        const colTickets = getTicketsByStatus(col.id);
        const isCollapsed = collapsedColumns[col.id];

        if (isCollapsed) {
          return (
            <div
              key={col.id}
              onClick={() => toggleColumn(col.id)}
              style={{
                backgroundColor: 'var(--color-gray-100)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                minHeight: '400px',
                cursor: 'pointer',
                userSelect: 'none',
                width: '50px',
                overflow: 'hidden',
                borderTop: `4px solid ${col.color}`,
                boxShadow: 'var(--shadow-sm)',
                transition: 'background-color var(--transition-fast)'
              }}
              title={`Expandir columna: ${col.label}`}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleColumn(col.id);
                }}
                style={{
                  color: 'var(--color-gray-400)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight size={16} />
              </button>

              <div style={{ color: col.color, display: 'flex', justifyContent: 'center' }}>
                {col.icon}
              </div>

              <span style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-bold)',
                backgroundColor: 'var(--color-white)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--color-gray-700)'
              }}>
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
            </div>
          );
        }

        return (
          <div
            key={col.id}
            style={{
              backgroundColor: 'var(--color-gray-100)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minHeight: '400px'
            }}
          >
            {/* Header columna */}
            <div className="flex align-center justify-between" style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: '8px' }}>
              <div className="flex align-center gap-2" style={{ color: 'var(--color-black)' }}>
                {col.icon}
                <span className="semibold text-sm">{col.label}</span>
              </div>
              <div className="flex align-center gap-2">
                <span style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-bold)',
                  backgroundColor: 'var(--color-white)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {colTickets.length}
                </span>
                <button
                  onClick={() => toggleColumn(col.id)}
                  style={{
                    color: 'var(--color-gray-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                    transition: 'color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-gray-700)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}
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
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--color-gray-400)',
                  fontSize: 'var(--text-xs)',
                  border: '1px dashed var(--color-gray-200)',
                  borderRadius: 'var(--radius-sm)'
                }}>
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
