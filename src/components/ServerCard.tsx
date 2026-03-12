import { useState, useEffect, useCallback } from 'react';
import { getServerTools } from '../api';
import type { Server } from '../types';

interface ServerCardProps {
  server: Server;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onEdit: (id: string | undefined) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function ServerCard({
  server,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ServerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tools, setTools] = useState<Array<{ name: string }>>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const [oauthRequired, setOauthRequired] = useState(false);

  const fetchTools = useCallback(() => {
    setToolsLoading(true);
    setToolsError(null);
    setOauthRequired(false);
    getServerTools(server.id!)
      .then(({ tools: list }) => {
        setTools(list || []);
        setOauthRequired(false);
      })
      .catch((err: Error & { code?: string }) => {
        if (err.code === 'OAUTH_REQUIRED') {
          setOauthRequired(true);
          setToolsError(err.message);
        } else {
          setToolsError(err.message);
        }
        setTools([]);
      })
      .finally(() => setToolsLoading(false));
  }, [server.id]);

  useEffect(() => {
    if (!expanded) return;
    fetchTools();
  }, [expanded, fetchTools]);

  const handleAction = async (action: 'edit' | 'delete' | 'toggle') => {
    try {
      switch (action) {
        case 'edit':
          onEdit(server.id);
          break;
        case 'delete':
          if (confirm('Delete this server?')) {
            await onDelete(server.id!);
          }
          break;
        case 'toggle':
          await onToggle(server.id!, !server.enabled);
          break;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', server.id!);
      onDragStart();
    }
  };

  return (
    <div
      className={`server-card ${expanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={server.id}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="server-card-header">
        <button
          type="button"
          className="server-card-expand-trigger"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {onDragStart && (
            <span
              className="server-card-drag-handle"
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
          <span className="server-card-chevron" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <div className="server-info">
            <span className="server-name">{server.name || server.id}</span>
            <span className="server-meta">
              {server.type}
              {server.command ? ` • ${server.command}` : ''}
              {server.url ? ` • ${server.url}` : ''}
            </span>
            <span className={`server-status ${server.enabled ? 'enabled' : 'disabled'}`}>
              {server.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </button>
        <div className="server-actions">
        {(onMoveUp || onMoveDown) && (
          <div className="server-reorder">
            <button
              type="button"
              className="btn btn-sm btn-icon"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              title="Move up"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-sm btn-icon"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              title="Move down"
              aria-label="Move down"
            >
              ↓
            </button>
          </div>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => handleAction('toggle')}
        >
          {server.enabled ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => handleAction('edit')}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => handleAction('delete')}
        >
          Delete
        </button>
      </div>
      </div>

      {expanded && (
        <div className="server-card-expanded">
          {toolsLoading && (
            <div className="server-tools-loading">Loading tools…</div>
          )}
          {oauthRequired && (
            <div className="server-tools-oauth">
              <p>{toolsError}</p>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={fetchTools}
              >
                Retry
              </button>
            </div>
          )}
          {toolsError && !oauthRequired && (
            <div className="server-tools-error">
              {toolsError === 'Not Found'
                ? 'Tools API unavailable. Restart the AI Tools Manager server and try again.'
                : toolsError}
            </div>
          )}
          {!toolsLoading && !toolsError && tools.length > 0 && (
            <div className="server-tools-grid">
              {tools.map((tool) => (
                <span key={tool.name} className="server-tool-tag">
                  {tool.name}
                </span>
              ))}
            </div>
          )}
          {!toolsLoading && !toolsError && tools.length === 0 && (
            <div className="server-tools-empty">No tools available</div>
          )}
          <button
            type="button"
            className="server-card-collapse-btn"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
}
