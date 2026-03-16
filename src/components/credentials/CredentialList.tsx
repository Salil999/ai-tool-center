import { CredentialCard } from './CredentialCard';
import { useDragReorder } from '@/hooks/useDragReorder';
import type { Credential } from '../../types';

interface CredentialListProps {
  credentials: Credential[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (order: string[]) => void;
}

export function CredentialList({ credentials, onEdit, onDelete, onReorder }: CredentialListProps) {
  const ids = credentials.map((c) => c.id);
  const drag = useDragReorder(ids, onReorder);

  if (!credentials.length) {
    return (
      <div className="empty-state">
        No API credentials stored. Click &quot;Add Credential&quot; to add your first key.
      </div>
    );
  }

  return (
    <div className="credential-list">
      {credentials.map((cred) => (
        <CredentialCard
          key={cred.id}
          credential={cred}
          isDragging={drag.draggedId === cred.id}
          isDropTarget={drag.dropTargetId === cred.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onDragStart={() => drag.handleDragStart(cred.id)}
          onDragOver={(e) => drag.handleDragOver(e, cred.id)}
          onDragLeave={drag.handleDragLeave}
          onDrop={(e) => drag.handleDrop(e, cred.id)}
          onDragEnd={drag.handleDragEnd}
        />
      ))}
    </div>
  );
}
