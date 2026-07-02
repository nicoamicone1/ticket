import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './ToastContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Ref para usar toast dentro de la suscripción sin re-crear el canal Realtime
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const userId = user?.id;

  // Derivado del estado: no puede desincronizarse de la lista
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data as Notification[]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    // Suscripción Realtime a nuevas notificaciones
    const subscription = supabase
      .channel(`user_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Deduplicar: puede llegar por Realtime y por un fetch en vuelo
          setNotifications((prev) =>
            prev.some((n) => n.id === newNotif.id) ? prev : [newNotif, ...prev]
          );

          // Mostrar un toast in-app
          toastRef.current.info(`${newNotif.title}: ${newNotif.body}`);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toastRef.current.error('No se pudo marcar la notificación como leída');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toastRef.current.success('Todas las notificaciones marcadas como leídas');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toastRef.current.error('No se pudieron marcar las notificaciones como leídas');
    }
  }, [userId]);

  const value = useMemo(
    () => ({ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, fetchNotifications }),
    [notifications, unreadCount, isLoading, markAsRead, markAllAsRead, fetchNotifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications debe ser utilizado dentro de un NotificationProvider');
  }
  return context;
};
