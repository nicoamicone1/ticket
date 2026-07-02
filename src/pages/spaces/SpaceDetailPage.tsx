import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import type { Space } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/hooks/useTickets';
import type { TicketFilters as Filters } from '@/hooks/useTickets';
import { KanbanBoard } from '@/components/tickets/KanbanBoard';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft, Plus, Calendar, Clock, CheckCircle2, Download } from 'lucide-react';
import { exportToCSV, getTicketStats } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { StatsCard } from '@/components/dashboard/StatsCard';

export const SpaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { tickets, isLoading, fetchTickets } = useTickets();

  const [space, setSpace] = useState<Space | null>(null);
  const [spaceLoading, setSpaceLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  const [filters, setFilters] = useState<Filters>({});

  const fetchSpaceDetails = useCallback(async () => {
    if (!id) return;
    setSpaceLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          *,
          client:client_id (id, full_name, email, avatar_url),
          programmer:programmer_id (id, full_name, email, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setSpace(data as Space);
    } catch (err) {
      console.error('Error fetching space details:', err);
      // PGRST116 = cero filas: el espacio no existe o no hay permiso (404 real).
      // Cualquier otro error es un fallo de red/servidor y merece reintento.
      const code = (err as { code?: string })?.code;
      setLoadError(code !== 'PGRST116');
    } finally {
      setSpaceLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSpaceDetails();
  }, [fetchSpaceDetails]);

  useEffect(() => {
    if (id) {
      fetchTickets(id, filters);
    }
  }, [id, filters, fetchTickets]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  const handleExport = () => {
    if (!space) return;
    const headers = ['ID', 'Titulo', 'Estado', 'Prioridad', 'Horas Estimadas', 'Creado el', 'Categorias'];
    const rows = tickets.map((t) => [
      t.id,
      t.title,
      t.status,
      t.priority,
      t.estimated_hours || 0,
      new Date(t.created_at).toLocaleDateString('es-AR'),
      t.tags?.join('; ') || ''
    ]);
    exportToCSV(`tickets_${space.name.replace(/\s+/g, '_')}`, headers, rows);
  };

  if (spaceLoading) {
    return <Spinner centered />;
  }

  if (!space) {
    return (
      <Card style={{ padding: '32px', textAlign: 'center' }}>
        <h3 className="semibold text-lg" style={{ color: 'var(--color-error)' }}>
          {loadError ? 'No se pudo cargar el espacio' : 'Espacio no encontrado'}
        </h3>
        <p className="text-muted text-sm" style={{ marginTop: '8px', marginBottom: '16px' }}>
          {loadError
            ? 'Revisá tu conexión e intentá de nuevo.'
            : 'El espacio al que intentás acceder no existe o no tenés permisos.'}
        </p>
        <div className="flex justify-center gap-3">
          {loadError && (
            <Button variant="primary" onClick={fetchSpaceDetails}>Reintentar</Button>
          )}
          <Link to="/spaces" className="btn btn-secondary">Volver a Espacios</Link>
        </div>
      </Card>
    );
  }

  const partner = profile?.role === 'cliente' ? space.programmer : space.client;

  // Estadísticas del espacio (las horas aprobadas excluyen estimaciones sin aprobar)
  const stats = getTicketStats(tickets);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header del espacio */}
      <div className="flex flex-col gap-2">
        <Link to="/spaces" className="flex align-center gap-1 text-xs text-muted" style={{ fontWeight: 'var(--font-medium)' }}>
          <ArrowLeft size={14} /> Volver a mis espacios
        </Link>
        <div className="flex justify-between align-center flex-wrap gap-4" style={{ marginTop: '8px' }}>
          <div>
            <h2 className="bold text-2xl" style={{ color: 'var(--color-black)' }}>{space.name}</h2>
            <p className="text-muted text-sm">
              Vinculado con {profile?.role === 'cliente' ? 'el programador' : 'el cliente'}{' '}
              <span className="semibold" style={{ color: 'var(--color-black)' }}>{partner?.full_name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport} icon={<Download size={16} />}>
              Exportar CSV
            </Button>
            <Link to={`/spaces/${space.id}/tickets/new`} className="btn btn-primary" style={{ gap: '8px' }}>
              <Plus size={16} /> Crear Ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-4 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatsCard label="Horas aprobadas" value={`${stats.approvedHours}h`} icon={<Clock size={20} />} />
        <StatsCard label="Por aprobar" value={stats.estimated} icon={<Calendar size={20} />} bgColor="var(--color-warning-bg)" color="var(--color-warning)" />
        <StatsCard label="En progreso" value={stats.inProgress} icon={<Clock size={20} style={{ transform: 'rotate(90deg)' }} />} bgColor="var(--color-info-bg)" color="var(--color-info)" />
        <StatsCard label="Resueltos" value={stats.resolved} icon={<CheckCircle2 size={20} />} bgColor="var(--color-success-bg)" color="var(--color-success)" />
      </div>

      {/* Filtros */}
      <TicketFilters onFilterChange={handleFilterChange} />

      {/* Tab bar (Kanban vs Lista) */}
      <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Tabs
          tabs={[
            { id: 'kanban', label: 'Tablero Kanban' },
            { id: 'list', label: 'Lista' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="text-xs text-muted" style={{ paddingBottom: '12px' }}>
          Total: <span className="semibold" style={{ color: 'var(--color-black)' }}>{tickets.length} tickets</span>
        </div>
      </div>

      {/* Cuerpo de Tickets */}
      {isLoading && tickets.length === 0 ? (
        <Spinner centered />
      ) : tickets.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <h4 className="semibold text-base">No se encontraron tickets</h4>
          <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
            {profile?.role === 'cliente'
              ? 'Intentá creando un nuevo ticket para tu programador.'
              : 'Podés crear un ticket nuevo para tu cliente o esperar a que él cree uno.'}
          </p>
        </Card>
      ) : activeTab === 'kanban' ? (
        <KanbanBoard tickets={tickets} />
      ) : (
        /* Vista Lista */
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-gray-100)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-semibold)' }}>
                <th style={{ padding: '12px 16px' }}>Título</th>
                <th style={{ padding: '12px 16px' }}>Estado</th>
                <th style={{ padding: '12px 16px' }}>Prioridad</th>
                <th style={{ padding: '12px 16px' }}>Estimación</th>
                <th style={{ padding: '12px 16px' }}>Fecha</th>
                <th style={{ padding: '12px 16px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px', fontWeight: 'var(--font-medium)' }} className="truncate">
                    {t.title}
                  </td>
                  <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                    <span style={{
                      color: t.status === 'resuelto' ? 'var(--color-success)' : t.status === 'en_progreso' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontWeight: 'var(--font-semibold)'
                    }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      color: t.priority === 'urgente' ? 'var(--color-error)' : t.priority === 'alta' ? 'var(--color-priority-alta)' : 'var(--color-text-muted)',
                      fontWeight: 'var(--font-semibold)'
                    }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {t.estimated_hours ? `${t.estimated_hours} horas` : 'Pendiente'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-muted)' }}>
                    {new Date(t.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <Link to={`/tickets/${t.id}`} className="semibold" style={{ color: 'var(--color-primary)' }}>
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

    </div>
  );
};
