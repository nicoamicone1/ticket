import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import '@/components/ui/ui.css';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ selectedTags, onChange }) => {
  const [newTag, setNewTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const predefinedTags = ['bug', 'feature', 'consulta', 'mejora', 'diseño'];

  const handleTogglePredefined = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
      setNewTag('');
      setShowInput(false);
    }
  };

  const handleRemove = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="form-group" style={{ marginBottom: '20px' }}>
      <label className="form-label">Categorías (Tags)</label>
      
      {/* Sugeridos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', marginTop: '4px' }}>
        {predefinedTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleTogglePredefined(tag)}
              aria-pressed={isSelected}
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-gray-100)',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-gray-600)',
                border: `1px solid ${isSelected ? 'var(--color-primary-subtle)' : 'var(--color-gray-200)'}`,
                transition: 'var(--transition-fast)'
              }}
            >
              {tag}
            </button>
          );
        })}

        {/* Botón agregar custom */}
        {!showInput ? (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: '1px dashed var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={12} /> Otro
          </button>
        ) : (
          <form onSubmit={handleAddCustom} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              placeholder="Nueva tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="form-control"
              style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', width: '100px', height: '24px' }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowInput(false)}
              aria-label="Cancelar nueva etiqueta"
              style={{ color: 'var(--color-error)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </form>
        )}
      </div>

      {/* Seleccionados (si no están en los sugeridos) */}
      {selectedTags.some(t => !predefinedTags.includes(t)) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {selectedTags
            .filter((t) => !predefinedTags.includes(t))
            .map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-medium)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary-subtle)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {tag}
                <button type="button" onClick={() => handleRemove(tag)} aria-label={`Quitar etiqueta ${tag}`} style={{ display: 'flex', color: 'var(--color-primary)' }}>
                  <X size={10} />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
};
