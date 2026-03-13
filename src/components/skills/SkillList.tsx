import { useState } from 'react';
import { SkillCard } from './SkillCard';
import type { Skill } from '../../types';

interface SkillListProps {
  skills: (Skill & { id: string })[];
  lintRefreshKey?: number;
  onEdit: (id: string | undefined) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onReorder: (order: string[]) => void;
}

export function SkillList({
  skills,
  lintRefreshKey = 0,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
}: SkillListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (!skills.length) {
    return (
      <div className="empty-state">
        No skills configured. Click &quot;Add Skill&quot; to create one or add by path.
      </div>
    );
  }

  const ids = skills.map((s) => s.id);

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
      {skills.map((skill, index) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          lintRefreshKey={lintRefreshKey}
          isDragging={draggedId === skill.id}
          isDropTarget={dropTargetId === skill.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onMoveUp={index > 0 ? () => handleMove(index, 'up') : undefined}
          onMoveDown={index < skills.length - 1 ? () => handleMove(index, 'down') : undefined}
          onDragStart={() => handleDragStart(skill.id)}
          onDragOver={(e) => handleDragOver(e, skill.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, skill.id)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
