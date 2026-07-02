import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import type { Notification } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useNavigate } from 'react-router';
import { Check, BellOff, MessageSquare, PlusCircle, Calculator, CheckCircle2, PlayCircle, AlertTriangle } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.ticket_id) {
      navigate(`/tickets/${notif.ticket_id}`);
    }
  };

  const getIcon = (type: string) => {
    const size = 18;
    switch (type) {
      case 'new_ticket':
        return <PlusCircle size={size} color="var(--color-primary)" />;
      case 'estimated':
        return <Calculator size={size} color="var(--color-warning)" />;
      case 'approved':
        return <CheckCircle2 size={size} color="var(--color-success)" />;
      case 'rejected':
        return <AlertTriangle size={size} color="var(--color-error)" />;
      case 'in_progress':
        return <PlayCircle size={size} color="var(--color-info)" />;
      case 'resolved':
        return <CheckCircle2 size={size} color="var(--color-success)" style={{ fill: 'var(--color-success-bg)' }} />;
      case 'comment':
      default:
        return <MessageSquare size={size} color="var(--color-gray-500)" />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="flex justify-between align-center">
        <div>
          <h2 className="bold text-2xl" style={{ color: 'var(--color-black)' }}>Notificaciones</h2>
          <p className="text-muted text-sm">Mantenete al tanto de la actividad en tus tickets</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <Button variant="secondary" onClick={markAllAsRead} icon={<Check size={16} />}>
            Marcar todo como leído
          </Button>
        )}
      </div>

      {/* Lista */}
      {isLoading && notifications.length === 0 ? (
        <Spinner centered />
      ) : notifications.length === 0 ? (
        <Card style={{ padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)' }} className="justify-center">
            <BellOff size={28} />
          </div>
          <h3 className="semibold text-lg" style={{ color: 'var(--color-black)' }}>No hay notificaciones</h3>
          <p className="text-muted text-sm">Te avisaremos acá cuando haya novedades en tus tickets.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNotificationClick(notif);
                }
              }}
              aria-label={`${notif.is_read ? '' : 'No leída: '}${notif.title}`}
              style={{
                display: 'flex',
                alignItems: 'start',
                gap: '16px',
                padding: '16px 20px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: notif.is_read ? 'var(--color-surface)' : 'var(--color-primary-light)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                position: 'relative'
              }}
              className="card-hover"
            >
              {/* Indicador de no leído */}
              {!notif.is_read && (
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)'
                }} />
              )}

              {/* Ícono de acción */}
              <div style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-white)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getIcon(notif.type)}
              </div>

              {/* Texto */}
              <div className="flex-1">
                <h4 className="semibold text-sm" style={{ color: 'var(--color-black)', marginBottom: '2px' }}>{notif.title}</h4>
                <p className="text-muted text-xs">{notif.body}</p>
                <span className="text-muted" style={{ fontSize: 'var(--text-2xs)', marginTop: '6px', display: 'inline-block' }}>
                  {new Date(notif.created_at).toLocaleDateString('es-AR')} a las {new Date(notif.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
