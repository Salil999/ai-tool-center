import { useState, useCallback } from 'react';

/**
 * Shared drag-and-drop reorder logic used by all list components.
 * Eliminates duplicated state and handlers across ServerList, SkillList,
 * CredentialList, ProviderRuleList, etc.
 */
export function useDragReorder(ids: string[], onReorder: (order: string[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      if (draggedId && draggedId !== id) setDropTargetId(id);
    },
    [draggedId]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
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
    },
    [draggedId, ids, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
  }, []);

  const handleMove = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const newOrder = [...ids];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= newOrder.length) return;
      [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
      onReorder(newOrder);
    },
    [ids, onReorder]
  );

  return {
    draggedId,
    dropTargetId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleMove,
  };
}
