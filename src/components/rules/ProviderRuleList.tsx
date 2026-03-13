import { useState } from 'react';
import { ProviderRuleCard } from './ProviderRuleCard';
import type { ProviderRule } from '../../types';

interface ProviderRuleListProps {
  rules: ProviderRule[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (order: string[]) => void;
}

export function ProviderRuleList({ rules, onEdit, onDelete, onReorder }: ProviderRuleListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (!rules.length) {
    return (
      <div className="empty-state">
        No rules. Click &quot;Add Rule&quot; to create one.
      </div>
    );
  }

  const ids = rules.map((r) => r.id);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...ids];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    onReorder(newOrder);
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) setDropTargetId(id);
  };
  const handleDragLeave = () => setDropTargetId(null);
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
      {rules.map((rule, index) => (
        <ProviderRuleCard
          key={rule.id}
          rule={rule}
          isDragging={draggedId === rule.id}
          isDropTarget={dropTargetId === rule.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={index > 0 ? () => handleMove(index, 'up') : undefined}
          onMoveDown={index < rules.length - 1 ? () => handleMove(index, 'down') : undefined}
          onDragStart={() => handleDragStart(rule.id)}
          onDragOver={(e) => handleDragOver(e, rule.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, rule.id)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
