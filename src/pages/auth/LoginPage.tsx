import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor, completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message || 'Error de inicio de sesión');
      } else {
        toast.success('¡Sesión iniciada con éxito!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error('Ocurrió un error inesperado');
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
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <h2 className="bold text-3xl" style={{ color: 'var(--color-black)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Ticket<span style={{ color: 'var(--color-primary)' }}>.</span>
          </h2>
          <p className="text-muted text-sm">Gestioná tus tickets y estimaciones de forma minimalista</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            disabled={isLoading}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
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
            icon={<LogIn size={16} />}
            style={{ marginTop: '24px' }}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="text-center" style={{ marginTop: '24px', fontSize: 'var(--text-sm)' }}>
          <span className="text-muted">¿No tenés una cuenta? </span>
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>
            Registrate acá
          </Link>
        </div>
      </div>
    </div>
  );
};
