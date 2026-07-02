import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { TicketActivity } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

export const useTicketActivity = (ticketId: string) => {
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descarta respuestas de fetches viejos si cambia el ticket con un fetch en vuelo
  const fetchSeqRef = useRef(0);

  const fetchActivities = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ticket_activity')
        .select(`
          *,
          actor:actor_id (id, full_name, email, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (seq !== fetchSeqRef.current) return;
      if (fetchError) throw fetchError;
      setActivities(data as TicketActivity[]);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Error fetching activity logs:', err);
      setError(getErrorMessage(err, 'Error al cargar el historial'));
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  }, [ticketId]);

  return {
    activities,
    isLoading,
    error,
    fetchActivities
  };
};
