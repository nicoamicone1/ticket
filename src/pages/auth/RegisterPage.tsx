import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/lib/types';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, User, UserCheck, Briefcase } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export const RegisterPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cliente');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Por favor, completa todos los campos');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email.trim(), password, fullName.trim(), role);
      if (error) {
        toast.error(error.message || 'Error al registrarse');
      } else {
        toast.success('¡Registro exitoso! Por favor, verifica tu correo.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      padding: '24px'
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <h2 className="bold text-3xl" style={{ color: 'var(--color-black)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Registrate<span style={{ color: 'var(--color-primary)' }}>.</span>
          </h2>
          <p className="text-muted text-sm">Creá tu cuenta de Ticket y empezá a gestionar</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Role selector */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Elegí tu rol</label>
            <div className="grid grid-cols-2 gap-3" style={{ marginTop: '4px' }}>
              <button
                type="button"
                className={`btn ${role === 'cliente' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '70px', flexDirection: 'column', gap: '4px' }}
                onClick={() => setRole('cliente')}
                disabled={isLoading}
              >
                <UserCheck size={18} />
                <span className="semibold" style={{ fontSize: 'var(--text-sm)' }}>Cliente</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>Tengo un problema</span>
              </button>
              <button
                type="button"
                className={`btn ${role === 'programador' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '70px', flexDirection: 'column', gap: '4px' }}
                onClick={() => setRole('programador')}
                disabled={isLoading}
              >
                <Briefcase size={18} />
                <span className="semibold" style={{ fontSize: 'var(--text-sm)' }}>Programador</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>Resuelvo problemas</span>
              </button>
            </div>
          </div>

          <Input
            label="Nombre completo"
            type="text"
            placeholder="Juan Pérez"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User size={16} />}
            disabled={isLoading}
            required
          />

          <Input
            label="Correo electrónico"
            type="email"
            placeholder="juan@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            disabled={isLoading}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            disabled={isLoading}
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            style={{ marginTop: '24px' }}
          >
            Registrarse
          </Button>
        </form>

        <div className="text-center" style={{ marginTop: '24px', fontSize: 'var(--text-sm)' }}>
          <span className="text-muted">¿Ya tenés una cuenta? </span>
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>
            Iniciá sesión acá
          </Link>
        </div>
      </div>
    </div>
  );
};
