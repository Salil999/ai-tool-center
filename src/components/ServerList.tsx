import { ServerCard } from './ServerCard';
import type { Server } from '../types';

interface ServerListProps {
  servers: Server[];
  onEdit: (id: string | undefined) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function ServerList({
  servers,
  onEdit,
  onDelete,
  onToggle,
}: ServerListProps) {
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
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
