import React, { useEffect, useState } from 'react';
import { useSpaces } from '@/hooks/useSpaces';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Link } from 'react-router';
import { Copy, Plus, ArrowRight, User, Briefcase, Mail } from 'lucide-react';
import { copyToClipboard, getErrorMessage } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export const SpacesListPage: React.FC = () => {
  const { profile } = useAuth();
  const { spaces, isLoading, fetchSpaces, joinSpace } = useSpaces();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleCopyCode = async () => {
    if (profile?.invite_code) {
      const copied = await copyToClipboard(profile.invite_code);
      if (copied) {
        toast.success('¡Código de invitación copiado!');
      } else {
        toast.error('No se pudo copiar. Seleccioná el código manualmente.');
      }
    }
  };

  const handleJoinSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error('Por favor, ingresá un código');
      return;
    }

    setIsJoining(true);
    try {
      await joinSpace(inviteCode);
      toast.success('¡Te uniste al espacio con éxito!');
      setIsModalOpen(false);
      setInviteCode('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al unirse al espacio'));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Programador: Mostrar código de invitación */}
      {profile?.role === 'programador' && (
        <Card style={{ backgroundColor: 'var(--color-primary-light)', borderColor: 'var(--color-primary-subtle)', padding: '24px' }}>
          <div className="flex flex-col gap-3">
            <h3 className="semibold text-lg" style={{ color: 'var(--color-primary-hover)' }}>Tu Código de Invitación</h3>
            <p className="text-muted text-sm">Compartí este código con tus clientes para que se enlacen con vos y comiencen a crear tickets.</p>
            <div className="flex align-center gap-3" style={{ marginTop: '8px' }}>
              <div style={{
                backgroundColor: 'var(--color-white)',
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-bold)',
                letterSpacing: '0.1em',
                border: '1px solid var(--color-primary-subtle)',
                color: 'var(--color-black)'
              }}>
                {profile.invite_code}
              </div>
              <Button variant="secondary" onClick={handleCopyCode} icon={<Copy size={16} />}>
                Copiar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Header con título y CTA */}
      <div className="flex justify-between align-center">
        <div>
          <h2 className="bold text-2xl" style={{ color: 'var(--color-black)' }}>Espacios Activos</h2>
          <p className="text-muted text-sm">Gestioná tus enlaces de trabajo</p>
        </div>
        {profile?.role === 'cliente' && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={<Plus size={16} />}>
            Unirse a Programador
          </Button>
        )}
      </div>

      {/* Lista de Espacios */}
      {isLoading && spaces.length === 0 ? (
        <Spinner centered />
      ) : spaces.length === 0 ? (
        <Card style={{ padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)' }} className="justify-center">
            {profile?.role === 'cliente' ? <Briefcase size={28} /> : <User size={28} />}
          </div>
          <h3 className="semibold text-lg" style={{ color: 'var(--color-black)' }}>No hay espacios activos</h3>
          <p className="text-muted text-sm" style={{ maxWidth: '400px' }}>
            {profile?.role === 'cliente'
              ? 'Aún no te vinculaste con ningún programador. Hacé clic en "Unirse a Programador" e ingresá su código.'
              : 'Aún ningún cliente se enlazó con vos. Compartiles tu código de invitación para empezar.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {spaces.map((space) => {
            const partner = profile?.role === 'cliente' ? space.programmer : space.client;
            return (
              <Card key={space.id} hoverable style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
                <div className="flex align-center gap-3">
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gray-100)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'var(--font-bold)',
                    border: '1px solid var(--color-gray-200)',
                    fontSize: 'var(--text-lg)'
                  }}>
                    {partner?.full_name ? partner.full_name.charAt(0).toUpperCase() : <User size={20} />}
                  </div>
                  <div className="flex-1 truncate">
                    <h4 className="semibold text-base truncate" style={{ color: 'var(--color-black)' }}>
                      {partner?.full_name}
                    </h4>
                    <span className="flex align-center gap-1 text-xs text-muted">
                      <Mail size={12} />
                      {partner?.email}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }} className="flex justify-between align-center">
                  <span className="text-xs text-muted">
                    Creado {new Date(space.created_at).toLocaleDateString('es-AR')}
                  </span>
                  <Link to={`/spaces/${space.id}`} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                    Entrar <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal para Unirse a Espacio */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Vincularse con un Programador">
        <form onSubmit={handleJoinSpace}>
          <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
            Ingresá el código de invitación que te brindó tu programador para enlazar sus cuentas y empezar a crear y estimar tickets de soporte.
          </p>
          <Input
            label="Código de invitación"
            placeholder="E.g., 5F8D3A1B"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            disabled={isJoining}
            required
            autoFocus
          />
          <div className="flex justify-between gap-3" style={{ marginTop: '24px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isJoining}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isJoining}>
              Vincular Cuentas
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
