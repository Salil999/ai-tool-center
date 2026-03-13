import type { ProviderRule } from '../../types';

interface ProviderRuleCardProps {
  rule: ProviderRule;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function ProviderRuleCard({
  rule,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ProviderRuleCardProps) {
  const handleDelete = () => {
    if (confirm('Remove this rule?')) {
      onDelete(rule.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', rule.id);
      onDragStart();
    }
  };

  return (
    <div
      className={`server-card ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={rule.id}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="server-card-header">
        <div className="server-card-expand-trigger" style={{ cursor: 'default' }}>
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
          <div className="server-info skill-card-info">
            <div className="skill-name-row">
              <span className="server-name">{rule.name}</span>
              <span className="server-meta">{rule.id}{rule.extension}</span>
            </div>
          </div>
        </div>
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
          <button type="button" className="btn btn-sm" onClick={() => onEdit(rule.id)}>
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
