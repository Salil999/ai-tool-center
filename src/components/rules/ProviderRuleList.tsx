import { ProviderRuleCard } from './ProviderRuleCard';
import { useDragReorder } from '@/hooks/useDragReorder';
import type { ProviderRule } from '../../types';

interface ProviderRuleListProps {
  rules: ProviderRule[];
  providerId: string;
  lintRefreshKey?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (order: string[]) => void;
}

export function ProviderRuleList({ rules, providerId, lintRefreshKey, onEdit, onDelete, onReorder }: ProviderRuleListProps) {
  const ids = rules.map((r) => r.id);
  const drag = useDragReorder(ids, onReorder);

  if (!rules.length) {
    return (
      <div className="empty-state">
        No rules.
      </div>
    );
  }

  return (
    <div className="server-list">
      {rules.map((rule, index) => (
        <ProviderRuleCard
          key={rule.id}
          rule={rule}
          providerId={providerId}
          lintRefreshKey={lintRefreshKey}
          isDragging={drag.draggedId === rule.id}
          isDropTarget={drag.dropTargetId === rule.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={index > 0 ? () => drag.handleMove(index, 'up') : undefined}
          onMoveDown={index < rules.length - 1 ? () => drag.handleMove(index, 'down') : undefined}
          onDragStart={() => drag.handleDragStart(rule.id)}
          onDragOver={(e) => drag.handleDragOver(e, rule.id)}
          onDragLeave={drag.handleDragLeave}
          onDrop={(e) => drag.handleDrop(e, rule.id)}
          onDragEnd={drag.handleDragEnd}
        />
      ))}
    </div>
  );
}
