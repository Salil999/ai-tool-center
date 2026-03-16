import { ServerCard } from './ServerCard';
import { useDragReorder } from '@/hooks/useDragReorder';
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
  const ids = servers.map((s) => s.id!);
  const drag = useDragReorder(ids, onReorder);

  if (!servers.length) {
    return (
      <div className="empty-state">
        No MCP servers configured. Click &quot;Add Server&quot; to get started.
      </div>
    );
  }

  return (
    <div className="server-list">
      {servers.map((server) => (
        <ServerCard
          key={server.id!}
          server={server}
          isDragging={drag.draggedId === server.id}
          isDropTarget={drag.dropTargetId === server.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onDragStart={() => drag.handleDragStart(server.id!)}
          onDragOver={(e) => drag.handleDragOver(e, server.id!)}
          onDragLeave={drag.handleDragLeave}
          onDrop={(e) => drag.handleDrop(e, server.id!)}
          onDragEnd={drag.handleDragEnd}
        />
      ))}
    </div>
  );
}
