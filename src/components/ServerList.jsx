import { ServerCard } from './ServerCard';

export function ServerList({
  servers,
  onEdit,
  onDelete,
  onToggle,
}) {
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
          key={server.id}
          server={server}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
