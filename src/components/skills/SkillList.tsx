import { SkillCard } from './SkillCard';
import { useDragReorder } from '@/hooks/useDragReorder';
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
  const ids = skills.map((s) => s.id);
  const drag = useDragReorder(ids, onReorder);

  if (!skills.length) {
    return (
      <div className="empty-state">
        No skills configured. Click &quot;Add Skill&quot; to create one or add by path.
      </div>
    );
  }

  return (
    <div className="server-list">
      {skills.map((skill, index) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          lintRefreshKey={lintRefreshKey}
          isDragging={drag.draggedId === skill.id}
          isDropTarget={drag.dropTargetId === skill.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onMoveUp={index > 0 ? () => drag.handleMove(index, 'up') : undefined}
          onMoveDown={index < skills.length - 1 ? () => drag.handleMove(index, 'down') : undefined}
          onDragStart={() => drag.handleDragStart(skill.id)}
          onDragOver={(e) => drag.handleDragOver(e, skill.id)}
          onDragLeave={drag.handleDragLeave}
          onDrop={(e) => drag.handleDrop(e, skill.id)}
          onDragEnd={drag.handleDragEnd}
        />
      ))}
    </div>
  );
}
