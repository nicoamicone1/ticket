import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket, TicketStatus, TicketPriority } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export interface TicketFilters {
  status?: string[];
  priority?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useTickets = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (spaceId: string, filters?: TicketFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          creator:created_by (id, full_name, email, avatar_url)
        `)
        .eq('space_id', spaceId);

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Ordenar por fecha de creación por defecto
      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setTickets(data as Ticket[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al obtener tickets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTicket = useCallback(async (
    spaceId: string,
    title: string,
    description: string,
    priority: TicketPriority,
    files: File[],
    tags: string[] = [],
    estimatedHours?: number
  ) => {
    if (!profile) throw new Error('No autenticado');
    setIsLoading(true);
    setError(null);

    try {
      // 1. Crear el ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          space_id: spaceId,
          created_by: profile.id,
          title,
          description,
          priority,
          status: estimatedHours ? 'estimado' : 'pendiente',
          estimated_hours: estimatedHours || null,
          estimated_at: estimatedHours ? new Date().toISOString() : null,
          tags
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Subir adjuntos si los hay
      if (files.length > 0) {
        for (const file of files) {
          // Sanitizar nombre de archivo
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const filePath = `${spaceId}/${ticket.id}/${Date.now()}_${cleanFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          // Registrar en la DB
          const { error: attachError } = await supabase
            .from('ticket_attachments')
            .insert({
              ticket_id: ticket.id,
              file_name: file.name,
              file_url: publicUrl,
              file_type: file.type,
              file_size: file.size
            });

          if (attachError) throw attachError;
        }
      }

      return ticket as Ticket;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear el ticket');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const updateTicketStatus = useCallback(async (
    ticketId: string,
    status: TicketStatus,
    extraFields?: Record<string, any>
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
        ...extraFields
      };

      // Set timestamps based on state
      if (status === 'estimado') updateData.estimated_at = new Date().toISOString();
      if (status === 'aprobado') updateData.approved_at = new Date().toISOString();
      if (status === 'en_progreso') updateData.started_at = new Date().toISOString();
      if (status === 'resuelto') updateData.resolved_at = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Ticket;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al actualizar el estado del ticket');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Estados en los que un ticket todavía puede eliminarse (estimación no aprobada)
  const DELETABLE_STATUSES: TicketStatus[] = ['pendiente', 'estimado', 'rechazado'];

  const deleteTicket = useCallback(async (ticket: Ticket) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!DELETABLE_STATUSES.includes(ticket.status)) {
        throw new Error('Solo se pueden eliminar tickets cuya estimación aún no fue aprobada');
      }

      // 1. Limpiar archivos adjuntos del storage (best-effort, no bloquea el borrado)
      const folder = `${ticket.space_id}/${ticket.id}`;
      const { data: files } = await supabase.storage.from('attachments').list(folder);
      if (files && files.length > 0) {
        await supabase.storage
          .from('attachments')
          .remove(files.map((f) => `${folder}/${f.name}`));
      }

      // 2. Eliminar el ticket (la cascada borra adjuntos, comentarios, actividad y notificaciones)
      const { error: deleteError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticket.id);

      if (deleteError) throw deleteError;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al eliminar el ticket');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const estimateTicket = useCallback(async (ticketId: string, hours: number) => {
    return updateTicketStatus(ticketId, 'estimado', { estimated_hours: hours, rejection_reason: null });
  }, [updateTicketStatus]);

  const approveTicket = useCallback(async (ticketId: string) => {
    return updateTicketStatus(ticketId, 'aprobado');
  }, [updateTicketStatus]);

  const rejectTicket = useCallback(async (ticketId: string, reason: string) => {
    return updateTicketStatus(ticketId, 'rechazado', { rejection_reason: reason, estimated_hours: null });
  }, [updateTicketStatus]);

  const startTicket = useCallback(async (ticketId: string) => {
    return updateTicketStatus(ticketId, 'en_progreso');
  }, [updateTicketStatus]);

  const resolveTicket = useCallback(async (ticketId: string) => {
    return updateTicketStatus(ticketId, 'resuelto');
  }, [updateTicketStatus]);

  return {
    tickets,
    isLoading,
    error,
    fetchTickets,
    createTicket,
    deleteTicket,
    estimateTicket,
    approveTicket,
    rejectTicket,
    startTicket,
    resolveTicket
  };
};
