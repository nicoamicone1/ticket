import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Space } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export const useSpaces = () => {
  const { profile } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = useCallback(async () => {
    if (!profile) return;
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

      if (profile.role === 'cliente') {
        query = query.eq('client_id', profile.id);
      } else {
        query = query.eq('programmer_id', profile.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSpaces(data as Space[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al obtener espacios');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const joinSpace = useCallback(async (inviteCode: string) => {
    if (!profile || profile.role !== 'cliente') {
      throw new Error('Solo los clientes pueden unirse a espacios');
    }
    setIsLoading(true);
    setError(null);

    try {
      // 1. Buscar el programador por su código de invitación
      const { data: programmerProfile, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .eq('role', 'programador')
        .maybeSingle();

      if (searchError) throw searchError;
      if (!programmerProfile) {
        throw new Error('Código de invitación inválido o programador no encontrado');
      }

      // 2. Crear el espacio
      const { data: newSpace, error: insertError } = await supabase
        .from('spaces')
        .insert({
          client_id: profile.id,
          programmer_id: programmerProfile.id,
          name: `Espacio: ${programmerProfile.full_name}`
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // UNIQUE constraint violation
          throw new Error('Ya estás enlazado con este programador');
        }
        throw insertError;
      }

      await fetchSpaces();
      return newSpace as Space;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al unirse al espacio');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile, fetchSpaces]);

  return {
    spaces,
    isLoading,
    error,
    fetchSpaces,
    joinSpace
  };
};
