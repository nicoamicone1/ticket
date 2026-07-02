import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Comment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export const useComments = (ticketId: string) => {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descarta respuestas de fetches viejos si cambia el ticket con un fetch en vuelo
  const fetchSeqRef = useRef(0);

  const fetchComments = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select(`
          *,
          author:author_id (id, full_name, email, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (seq !== fetchSeqRef.current) return;
      if (fetchError) throw fetchError;
      setComments(data as Comment[]);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Error fetching comments:', err);
      setError(getErrorMessage(err, 'Error al cargar los comentarios'));
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  }, [ticketId]);

  const addComment = useCallback(async (content: string) => {
    if (!profile) throw new Error('No autenticado');
    try {
      const { data: newComment, error: insertError } = await supabase
        .from('comments')
        .insert({
          ticket_id: ticketId,
          author_id: profile.id,
          content
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Anexar localmente: el autor es el propio perfil, no hace falta refetch
      const commentWithAuthor = { ...(newComment as Comment), author: profile };
      setComments((prev) => [...prev, commentWithAuthor]);
      return commentWithAuthor;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  }, [ticketId, profile]);

  return {
    comments,
    isLoading,
    error,
    fetchComments,
    addComment
  };
};
