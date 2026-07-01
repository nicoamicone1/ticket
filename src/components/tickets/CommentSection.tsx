import React, { useEffect, useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Send, User } from 'lucide-react';

interface CommentSectionProps {
  ticketId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ ticketId }) => {
  const { profile } = useAuth();
  const { comments, isLoading, fetchComments, addComment } = useComments(ticketId);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(content);
      setContent('');
    } catch (err) {
      alert('Error al enviar el comentario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h3 className="semibold text-base" style={{ color: 'var(--color-black)' }}>Comentarios y Discusión</h3>
      
      {/* Lista de comentarios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 1 }}>
        {isLoading && comments.length === 0 ? (
          <p className="text-muted text-sm">Cargando comentarios...</p>
        ) : comments.length === 0 ? (
          <p className="text-muted text-sm" style={{ fontStyle: 'italic', padding: '12px 0' }}>No hay comentarios aún. Escribí un comentario para iniciar la conversación.</p>
        ) : (
          comments.map((c) => {
            const isMe = c.author_id === profile?.id;
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  flexDirection: isMe ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isMe ? 'var(--color-primary-light)' : 'var(--color-gray-200)',
                  color: isMe ? 'var(--color-primary)' : 'var(--color-gray-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'var(--font-bold)',
                  fontSize: 'var(--text-xs)',
                  flexShrink: 0
                }}>
                  {c.author?.full_name ? c.author.full_name.charAt(0).toUpperCase() : <User size={14} />}
                </div>

                {/* Burbuja de comentario */}
                <div style={{
                  backgroundColor: isMe ? 'var(--color-primary-light)' : 'var(--color-white)',
                  border: `1px solid ${isMe ? 'var(--color-primary-subtle)' : 'var(--color-gray-200)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div className="flex justify-between align-center gap-4" style={{ marginBottom: '4px' }}>
                    <span className="semibold text-xs" style={{ color: 'var(--color-black)' }}>
                      {c.author?.full_name}
                    </span>
                    <span className="text-muted" style={{ fontSize: '10px' }}>
                      {new Date(c.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - {new Date(c.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-black)', whiteSpace: 'pre-line' }}>
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex gap-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
        <textarea
          className="form-control"
          placeholder="Escribí un comentario..."
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          style={{ resize: 'none', height: '60px' }}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!content.trim() || isSubmitting}
          style={{ width: '60px', height: '60px', padding: 0 }}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};
