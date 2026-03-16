import { useState, useEffect, useCallback } from 'react';
import { getSubagentLint } from '../../api-client';
import { SubagentLintReportsView } from './SubagentLintReports';
import type { Subagent, SubagentLintReport } from '../../types';

type LintReportsMap = Record<string, SubagentLintReport>;

interface SubagentCardProps {
  subagent: Subagent & { id: string };
  lintRefreshKey?: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function SubagentCard({
  subagent,
  lintRefreshKey = 0,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onToggle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: SubagentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lintReports, setLintReports] = useState<LintReportsMap | null>(null);
  const [lintLoading, setLintLoading] = useState(false);
  const [lintError, setLintError] = useState<string | null>(null);

  const fetchLint = useCallback(() => {
    setLintLoading(true);
    setLintError(null);
    getSubagentLint(subagent.id)
      .then((r) => setLintReports(r as LintReportsMap))
      .catch((err) => {
        setLintError((err as Error).message);
        setLintReports(null);
      })
      .finally(() => setLintLoading(false));
  }, [subagent.id]);

  useEffect(() => {
    if (!expanded) return;
    fetchLint();
  }, [expanded, fetchLint, lintRefreshKey]);

  const handleAction = async (action: 'edit' | 'delete' | 'toggle') => {
    switch (action) {
      case 'edit':
        onEdit(subagent.id);
        break;
      case 'delete':
        if (confirm('Remove this subagent?')) {
          await onDelete(subagent.id);
        }
        break;
      case 'toggle':
        await onToggle(subagent.id, !subagent.enabled);
        break;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', subagent.id);
      onDragStart();
    }
  };

  const desc = subagent.description || '';
  const truncated = desc.length > 120 ? desc.slice(0, 120) + '…' : desc;

  return (
    <div
      className={`server-card ${expanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={subagent.id}
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
          <div className="server-info skill-card-info">
            <div className="skill-name-row">
              <span className="server-name">{subagent.name || subagent.id}</span>
              <span className={`server-status ${subagent.enabled ? 'enabled' : 'disabled'}`}>
                {subagent.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {truncated && (
              <span className="server-meta">{truncated}</span>
            )}
          </div>
        </button>
        <div className="server-actions">
          <button type="button" className="btn btn-sm" onClick={() => handleAction('toggle')}>
            {subagent.enabled ? 'Disable' : 'Enable'}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => handleAction('edit')}>
            Edit
          </button>
          <button type="button" className="btn btn-sm" onClick={() => handleAction('delete')}>
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="server-card-expanded">
          {lintLoading && (
            <div className="server-tools-loading">Validating subagent…</div>
          )}
          {lintError && (
            <div className="server-tools-error">{lintError}</div>
          )}
          {!lintLoading && !lintError && lintReports && (
            <>
              <SubagentLintReportsView reports={lintReports} />
              <button
                type="button"
                className="server-card-collapse-btn"
                onClick={() => setExpanded(false)}
              >
                Show less
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
