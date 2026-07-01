import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TicketActivity } from '@/lib/types';

export const useTicketActivity = (ticketId: string) => {
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_activity')
        .select(`
          *,
          actor:actor_id (id, full_name, email, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActivities(data as TicketActivity[]);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  return {
    activities,
    isLoading,
    fetchActivities
  };
};
