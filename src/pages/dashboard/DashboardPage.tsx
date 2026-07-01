import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Ticket, Space } from '@/lib/types';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { Card } from '@/components/ui/Card';
import { Link } from 'react-router';
import { ClipboardList, Clock, CheckCircle2, ArrowRight, Play, Briefcase } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile) return;
      setIsLoading(true);
      try {
        // 1. Obtener espacios en los que participa el usuario
        let spacesQuery = supabase.from('spaces').select('*');
        if (profile.role === 'cliente') {
          spacesQuery = spacesQuery.eq('client_id', profile.id);
        } else {
          spacesQuery = spacesQuery.eq('programmer_id', profile.id);
        }
        const { data: spacesData, error: spacesError } = await spacesQuery;
        if (spacesError) throw spacesError;
        setSpaces(spacesData as Space[]);

        // 2. Obtener tickets de esos espacios
        if (spacesData.length > 0) {
          const spaceIds = spacesData.map(s => s.id);
          const { data: ticketsData, error: ticketsError } = await supabase
            .from('tickets')
            .select(`
              *,
              space:space_id (id, name)
            `)
            .in('space_id', spaceIds)
            .order('created_at', { ascending: false });

          if (ticketsError) throw ticketsError;
          setTickets(ticketsData as Ticket[]);
        }
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [profile]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isClient = profile?.role === 'cliente';

  // Métricas generales
  const totalApprovedHours = tickets
    .filter(t => t.status !== 'rechazado' && t.status !== 'pendiente')
    .reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

  const pendingCount = tickets.filter(t => t.status === 'pendiente').length;
  const estimatedCount = tickets.filter(t => t.status === 'estimado').length;
  const inProgressCount = tickets.filter(t => t.status === 'en_progreso').length;
  const resolvedCount = tickets.filter(t => t.status === 'resuelto').length;

  // Acción requerida
  const actionTickets = tickets.filter((t) => {
    if (isClient) {
      // Cliente tiene que aprobar estimaciones
      return t.status === 'estimado';
    } else {
      // Programador tiene que estimar pendientes o iniciar aprobados
      return t.status === 'pendiente' || t.status === 'aprobado';
    }
  });

  // Generar datos para el gráfico simple (últimas 4 semanas)
  const getWeeklyData = () => {
    const data = [
      { label: 'Sem 1', value: 0 },
      { label: 'Sem 2', value: 0 },
      { label: 'Sem 3', value: 0 },
      { label: 'Sem 4', value: 0 }
    ];

    const now = new Date();
    tickets.forEach((t) => {
      const createdDate = new Date(t.created_at);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) data[3].value++;
      else if (diffDays <= 14) data[2].value++;
      else if (diffDays <= 21) data[1].value++;
      else if (diffDays <= 28) data[0].value++;
    });

    return data;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Saludo */}
      <div>
        <h2 className="bold text-2xl" style={{ color: 'var(--color-black)' }}>
          ¡Hola, {profile?.full_name}!
        </h2>
        <p className="text-muted text-sm">
          Este es el resumen de tus espacios y tickets activos.
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-4 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {isClient ? (
          <>
            <StatsCard label="Por aprobar" value={estimatedCount} icon={<Clock size={20} />} bgColor="var(--color-warning-bg)" color="var(--color-warning)" />
            <StatsCard label="En Progreso" value={inProgressCount} icon={<Play size={20} />} bgColor="var(--color-info-bg)" color="var(--color-info)" />
            <StatsCard label="Resueltos" value={resolvedCount} icon={<CheckCircle2 size={20} />} bgColor="var(--color-success-bg)" color="var(--color-success)" />
            <StatsCard label="Horas aprobadas" value={`${totalApprovedHours}h`} icon={<Clock size={20} />} />
          </>
        ) : (
          <>
            <StatsCard label="Por Estimar" value={pendingCount} icon={<ClipboardList size={20} />} bgColor="var(--color-warning-bg)" color="var(--color-warning)" />
            <StatsCard label="En Progreso" value={inProgressCount} icon={<Play size={20} />} bgColor="var(--color-info-bg)" color="var(--color-info)" />
            <StatsCard label="Resueltos" value={resolvedCount} icon={<CheckCircle2 size={20} />} bgColor="var(--color-success-bg)" color="var(--color-success)" />
            <StatsCard label="Mis Clientes" value={spaces.length} icon={<Briefcase size={20} />} />
          </>
        )}
      </div>

      {/* Grid de contenido de acción y gráficos */}
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start', gridAutoFlow: 'row dense' }}>
        
        {/* Lado Izquierdo: Acción Requerida */}
        <Card style={{ padding: '24px' }}>
          <h3 className="semibold text-base" style={{ color: 'var(--color-black)', marginBottom: '16px' }}>
            {isClient ? 'Requiere tu Atención (Pendientes de aprobación)' : 'Acción Requerida (Pendientes de estimar o iniciar)'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {actionTickets.length === 0 ? (
              <p className="text-muted text-sm" style={{ fontStyle: 'italic', padding: '16px 0' }}>
                ¡Excelente! No tenés tareas pendientes de tu parte.
              </p>
            ) : (
              actionTickets.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-bg)'
                  }}
                >
                  <div className="flex-1 truncate" style={{ marginRight: '16px' }}>
                    <h4 className="semibold text-sm truncate" style={{ color: 'var(--color-black)' }}>{t.title}</h4>
                    <span className="text-xs text-muted">
                      Espacio: {t.space?.name} • {t.status === 'estimado' ? `${t.estimated_hours}h estimadas` : 'Pendiente'}
                    </span>
                  </div>
                  <Link to={`/tickets/${t.id}`} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                    Ver <ArrowRight size={12} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Lado Derecho: Gráfico */}
        <SimpleBarChart title="Carga de Tickets por Semana" data={getWeeklyData()} />

      </div>

    </div>
  );
};
