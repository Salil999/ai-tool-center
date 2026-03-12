import { useState } from 'react';
import { CredentialCard } from './CredentialCard';
import type { Credential } from '../../types';

interface CredentialListProps {
  credentials: Credential[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (order: string[]) => void;
}

export function CredentialList({ credentials, onEdit, onDelete, onReorder }: CredentialListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (!credentials.length) {
    return (
      <div className="empty-state">
        No API credentials stored. Click &quot;Add Credential&quot; to add your first key.
      </div>
    );
  }

  const ids = credentials.map((c) => c.id);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) setDropTargetId(id);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const newOrder = [...ids];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedId);
    onReorder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <div className="credential-list">
      {credentials.map((cred) => (
        <CredentialCard
          key={cred.id}
          credential={cred}
          isDragging={draggedId === cred.id}
          isDropTarget={dropTargetId === cred.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onDragStart={() => handleDragStart(cred.id)}
          onDragOver={(e) => handleDragOver(e, cred.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, cred.id)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
