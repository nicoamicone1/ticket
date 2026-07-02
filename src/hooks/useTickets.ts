import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket, TicketStatus, TicketPriority } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export interface TicketFilters {
  status?: string[];
  priority?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateTicketResult {
  ticket: Ticket;
  /** Nombres de archivos que no pudieron adjuntarse (el ticket sí se creó) */
  failedFiles: string[];
}

/** Campos extra permitidos al cambiar el estado de un ticket */
type StatusExtraFields = Partial<Pick<Ticket, 'estimated_hours' | 'rejection_reason'>>;

export const useTickets = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Token de secuencia: descarta respuestas de fetches viejos que resuelven tarde
  const fetchSeqRef = useRef(0);

  const fetchTickets = useCallback(async (spaceId: string, filters?: TicketFilters) => {
    const seq = ++fetchSeqRef.current;
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
      if (seq !== fetchSeqRef.current) return; // respuesta obsoleta
      if (fetchError) throw fetchError;
      setTickets(data as Ticket[]);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error(err);
      setError(getErrorMessage(err, 'Error al obtener tickets'));
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
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
  ): Promise<CreateTicketResult> => {
    if (!profile) throw new Error('No autenticado');
    if (estimatedHours !== undefined && profile.role !== 'programador') {
      throw new Error('Solo el programador puede crear tickets estimados');
    }
    setIsMutating(true);
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
          tags
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Subir adjuntos en paralelo. Si alguno falla, el ticket ya existe:
      //    se informa el fallo sin lanzar, para evitar reintentos que dupliquen el ticket.
      const failedFiles: string[] = [];
      if (files.length > 0) {
        const uploads = await Promise.all(
          files.map(async (file) => {
            try {
              const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
              const filePath = `${spaceId}/${ticket.id}/${Date.now()}_${cleanFileName}`;

              const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

              if (uploadError) throw uploadError;

              return {
                ticket_id: ticket.id,
                file_name: file.name,
                // Se guarda el path (no una URL pública): el bucket es privado
                // y la visualización usa URLs firmadas temporales
                file_url: filePath,
                file_type: file.type,
                file_size: file.size
              };
            } catch (err) {
              console.error(`Error subiendo ${file.name}:`, err);
              failedFiles.push(file.name);
              return null;
            }
          })
        );

        const rows = uploads.filter((r): r is NonNullable<typeof r> => r !== null);
        if (rows.length > 0) {
          const { error: attachError } = await supabase
            .from('ticket_attachments')
            .insert(rows);

          if (attachError) {
            console.error('Error registrando adjuntos:', attachError);
            failedFiles.push(...rows.map((r) => r.file_name));
          }
        }
      }

      return { ticket: ticket as Ticket, failedFiles };
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Error al crear el ticket'));
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [profile]);

  const updateTicketStatus = useCallback(async (
    ticketId: string,
    status: TicketStatus,
    extraFields?: StatusExtraFields
  ) => {
    setIsMutating(true);
    setError(null);
    try {
      // Los timestamps (estimated_at, approved_at, etc.) los setea el servidor
      const { data, error: updateError } = await supabase
        .from('tickets')
        .update({ status, ...extraFields })
        .eq('id', ticketId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Ticket;
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Error al actualizar el estado del ticket'));
      throw err;
    } finally {
      setIsMutating(false);
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
    if (profile?.role !== 'programador') throw new Error('Solo el programador puede estimar tickets');
    return updateTicketStatus(ticketId, 'estimado', { estimated_hours: hours, rejection_reason: null });
  }, [profile?.role, updateTicketStatus]);

  const approveTicket = useCallback(async (ticketId: string) => {
    return updateTicketStatus(ticketId, 'aprobado');
  }, [updateTicketStatus]);

  const rejectTicket = useCallback(async (ticketId: string, reason: string) => {
    return updateTicketStatus(ticketId, 'rechazado', { rejection_reason: reason, estimated_hours: null });
  }, [updateTicketStatus]);

  const startTicket = useCallback(async (ticketId: string) => {
    if (profile?.role !== 'programador') throw new Error('Solo el programador puede comenzar el trabajo');
    return updateTicketStatus(ticketId, 'en_progreso');
  }, [profile?.role, updateTicketStatus]);

  const resolveTicket = useCallback(async (ticketId: string) => {
    if (profile?.role !== 'programador') throw new Error('Solo el programador puede resolver el ticket');
    return updateTicketStatus(ticketId, 'resuelto');
  }, [profile?.role, updateTicketStatus]);

  return {
    tickets,
    isLoading,
    isMutating,
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
