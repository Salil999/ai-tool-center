import { useState } from 'react';
import { ServerCard } from './ServerCard';
import type { Server } from '../../types';

interface ServerListProps {
  servers: Server[];
  onEdit: (id: string | undefined) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onReorder: (order: string[]) => void;
}

export function ServerList({
  servers,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
}: ServerListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (!servers.length) {
    return (
      <div className="empty-state">
        No MCP servers configured. Click &quot;Add Server&quot; to get started.
      </div>
    );
  }

  const ids = servers.map((s) => s.id!);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...ids];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    onReorder(newOrder);
  };

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
    <div className="server-list">
      {servers.map((server, index) => (
        <ServerCard
          key={server.id!}
          server={server}
          isDragging={draggedId === server.id}
          isDropTarget={dropTargetId === server.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onMoveUp={index > 0 ? () => handleMove(index, 'up') : undefined}
          onMoveDown={index < servers.length - 1 ? () => handleMove(index, 'down') : undefined}
          onDragStart={() => handleDragStart(server.id!)}
          onDragOver={(e) => handleDragOver(e, server.id!)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, server.id!)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
