import { useState } from 'react';
import type { Credential } from '../../types';

interface CredentialCardProps {
  credential: Credential;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

function maskValue(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return '•'.repeat(Math.min(value.length, 20));
}

export function CredentialCard({
  credential,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: CredentialCardProps) {
  const [revealed, setRevealed] = useState(false);

  const handleDelete = () => {
    if (confirm('Delete this API credential? This cannot be undone.')) {
      onDelete(credential.id);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(credential.value);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', credential.id);
      onDragStart();
    }
  };

  return (
    <div
      className={`credential-card ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={credential.id}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="credential-card-main">
        {onDragStart && (
          <span
            className="credential-card-drag-handle"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder"
            aria-label="Drag to reorder"
            role="button"
            tabIndex={0}
          >
            ⋮⋮
          </span>
        )}
        <div className="credential-info">
          <span className="credential-name">{credential.name}</span>
          <span className="credential-value" title={revealed ? 'Click to copy' : undefined}>
            {revealed ? (
              <code className="credential-value-revealed" onClick={handleCopy}>
                {credential.value}
              </code>
            ) : (
              <span className="credential-value-masked">{maskValue(credential.value)}</span>
            )}
          </span>
        </div>
        <div className="credential-actions">
          <button
            type="button"
            className="btn btn-sm btn-icon credential-reveal-btn"
            onClick={() => setRevealed((r) => !r)}
            title={revealed ? 'Hide value' : 'Reveal value'}
            aria-label={revealed ? 'Hide value' : 'Reveal value'}
          >
            {revealed ? (
              <svg className="credential-icon-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l1.74 1.74c.57-.23 1.18-.36 1.83-.36zM2 4.27L4.28 6.55 4.73 7C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42C19.46 19.5 20.5 19 21 18.73L4.27 2 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.21.53-2.76 0-5-2.24-5-5 0-.8.2-1.54.53-2.21z" />
              </svg>
            ) : (
              <svg className="credential-icon-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            )}
          </button>
          {revealed && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              Copy
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={() => onEdit(credential.id)}>
            Edit
          </button>
          <button type="button" className="btn btn-sm" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
