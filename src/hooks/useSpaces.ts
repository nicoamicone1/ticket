import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Space } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export const useSpaces = () => {
  const { profile } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileId = profile?.id;
  const profileRole = profile?.role;

  const fetchSpaces = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('spaces')
        .select(`
          *,
          client:client_id (id, full_name, email, avatar_url),
          programmer:programmer_id (id, full_name, email, avatar_url)
        `);

      if (profileRole === 'cliente') {
        query = query.eq('client_id', profileId);
      } else {
        query = query.eq('programmer_id', profileId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSpaces(data as Space[]);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Error al obtener espacios'));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, profileRole]);

  const joinSpace = useCallback(async (inviteCode: string) => {
    if (!profileId || profileRole !== 'cliente') {
      throw new Error('Solo los clientes pueden unirse a espacios');
    }
    setIsLoading(true);
    setError(null);

    try {
      // La validación del código y la creación del espacio ocurren en el
      // servidor (RPC SECURITY DEFINER): el cliente nunca lee perfiles ajenos.
      const { data: newSpace, error: rpcError } = await supabase
        .rpc('join_space', { p_invite_code: inviteCode.trim() })
        .single();

      if (rpcError) throw rpcError;

      await fetchSpaces();
      return newSpace as Space;
    } catch (err) {
      console.error(err);
      const message = getErrorMessage(err, 'Error al unirse al espacio');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, profileRole, fetchSpaces]);

  return {
    spaces,
    isLoading,
    error,
    fetchSpaces,
    joinSpace
  };
};
