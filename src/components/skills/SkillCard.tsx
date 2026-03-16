import { useState, useEffect, useCallback } from 'react';
import { getSkillLint } from '../../api-client';
import type { Skill, LintReport } from '../../types';

interface SkillCardProps {
  skill: Skill & { id: string };
  lintRefreshKey?: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onEdit: (id: string | undefined) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function SkillCard({
  skill,
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
}: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lintReport, setLintReport] = useState<LintReport | null>(null);
  const [lintLoading, setLintLoading] = useState(false);
  const [lintError, setLintError] = useState<string | null>(null);

  const fetchLint = useCallback(() => {
    setLintLoading(true);
    setLintError(null);
    getSkillLint(skill.id)
      .then(setLintReport)
      .catch((err) => {
        setLintError((err as Error).message);
        setLintReport(null);
      })
      .finally(() => setLintLoading(false));
  }, [skill.id]);

  useEffect(() => {
    if (!expanded) return;
    fetchLint();
  }, [expanded, fetchLint, lintRefreshKey]);

  const handleAction = async (action: 'edit' | 'delete' | 'toggle') => {
    switch (action) {
      case 'edit':
        onEdit(skill.id);
        break;
      case 'delete':
        if (confirm('Remove this skill from the list?')) {
          await onDelete(skill.id);
        }
        break;
      case 'toggle':
        await onToggle(skill.id, !skill.enabled);
        break;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', skill.id);
      onDragStart();
    }
  };

  const desc = skill.description || '';
  const truncated = desc.length > 120 ? desc.slice(0, 120) + '…' : desc;

  return (
    <div
      className={`server-card ${expanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={skill.id}
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
              <span className="server-name">{skill.name || skill.id}</span>
              <span className={`server-status ${skill.enabled ? 'enabled' : 'disabled'}`}>
                {skill.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {truncated && (
              <span className="server-meta">{truncated}</span>
            )}
          </div>
        </button>
        <div className="server-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleAction('toggle')}
          >
            {skill.enabled ? 'Disable' : 'Enable'}
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
          {lintLoading && (
            <div className="server-tools-loading">Validating skill…</div>
          )}
          {lintError && (
            <div className="server-tools-error">{lintError}</div>
          )}
          {!lintLoading && !lintError && lintReport && (
            <>
              <div className="skill-lint-summary">
                {lintReport.errors === 0 && lintReport.warnings === 0 ? (
                  <span className="skill-lint-pass">✓ Passed validation</span>
                ) : (
                  <span className="skill-lint-issues">
                    {lintReport.errors > 0 && (
                      <span className="skill-lint-error-count">{lintReport.errors} error{lintReport.errors !== 1 ? 's' : ''}</span>
                    )}
                    {lintReport.warnings > 0 && (
                      <span className="skill-lint-warning-count">{lintReport.warnings} warning{lintReport.warnings !== 1 ? 's' : ''}</span>
                    )}
                  </span>
                )}
              </div>
              {lintReport.findings.length > 0 && (
                <ul className="skill-lint-findings">
                  {lintReport.findings.map((f, i) => (
                    <li key={i} className={`skill-lint-finding skill-lint-${f.level}`}>
                      <span className="skill-lint-level">{f.level}</span>
                      <span className="skill-lint-message">{f.message}</span>
                      {f.field && <span className="skill-lint-field">({f.field})</span>}
                    </li>
                  ))}
                </ul>
              )}
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
