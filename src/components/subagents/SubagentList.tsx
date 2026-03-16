import { SubagentCard } from './SubagentCard';
import { useDragReorder } from '@/hooks/useDragReorder';
import type { Subagent } from '../../types';

interface SubagentListProps {
  subagents: (Subagent & { id: string })[];
  lintRefreshKey?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onReorder: (order: string[]) => void;
}

export function SubagentList({
  subagents,
  lintRefreshKey = 0,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
}: SubagentListProps) {
  const ids = subagents.map((s) => s.id);
  const drag = useDragReorder(ids, onReorder);

  if (!subagents.length) {
    return (
      <div className="empty-state">
        No subagents configured. Click &quot;Add Subagent&quot; to create one or import from a provider.
      </div>
    );
  }

  return (
    <div className="server-list">
      {subagents.map((subagent) => (
        <SubagentCard
          key={subagent.id}
          subagent={subagent}
          lintRefreshKey={lintRefreshKey}
          isDragging={drag.draggedId === subagent.id}
          isDropTarget={drag.dropTargetId === subagent.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onDragStart={() => drag.handleDragStart(subagent.id)}
          onDragOver={(e) => drag.handleDragOver(e, subagent.id)}
          onDragLeave={drag.handleDragLeave}
          onDrop={(e) => drag.handleDrop(e, subagent.id)}
          onDragEnd={drag.handleDragEnd}
        />
      ))}
    </div>
  );
}
