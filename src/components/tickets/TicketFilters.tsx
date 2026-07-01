import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Search } from 'lucide-react';
import type { TicketFilters as FilterType } from '@/hooks/useTickets';

interface TicketFiltersProps {
  onFilterChange: (filters: FilterType) => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({ onFilterChange }) => {
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const priorityOptions = [
    { value: '', label: 'Todas las prioridades' },
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'Cualquier fecha' },
    { value: 'today', label: 'Creados hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' }
  ];

  useEffect(() => {
    const filters: FilterType = {};

    if (search.trim()) {
      filters.search = search;
    }

    if (priority) {
      filters.priority = [priority];
    }

    if (dateRange !== 'all') {
      const now = new Date();
      if (dateRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filters.dateFrom = start.toISOString();
      } else if (dateRange === 'week') {
        const start = new Date(now.setDate(now.getDate() - now.getDay())); // domingo
        start.setHours(0, 0, 0, 0);
        filters.dateFrom = start.toISOString();
      } else if (dateRange === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        filters.dateFrom = start.toISOString();
      }
    }

    onFilterChange(filters);
  }, [search, priority, dateRange, onFilterChange]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      alignItems: 'end',
      backgroundColor: 'var(--color-surface)',
      padding: '16px 24px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ flex: '2 1 300px' }}>
        <Input
          label="Buscar por título"
          placeholder="Escribí para buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={16} />}
          style={{ marginBottom: 0 }}
        />
      </div>

      <div style={{ flex: '1 1 200px' }}>
        <Select
          label="Prioridad"
          options={priorityOptions}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ marginBottom: 0 }}
        />
      </div>

      <div style={{ flex: '1 1 200px' }}>
        <Select
          label="Fecha de creación"
          options={dateRangeOptions}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={{ marginBottom: 0 }}
        />
      </div>
    </div>
  );
};
