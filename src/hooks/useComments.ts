import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Comment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export const useComments = (ticketId: string) => {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:author_id (id, full_name, email, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as Comment[]);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const addComment = useCallback(async (content: string) => {
    if (!profile) throw new Error('No autenticado');
    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          ticket_id: ticketId,
          author_id: profile.id,
          content
        })
        .select()
        .single();

      if (error) throw error;
      
      // Volver a cargar comentarios
      await fetchComments();
      return newComment as Comment;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  }, [ticketId, profile, fetchComments]);

  return {
    comments,
    isLoading,
    fetchComments,
    addComment
  };
};
