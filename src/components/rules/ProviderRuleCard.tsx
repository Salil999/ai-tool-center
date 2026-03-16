import { useState, useEffect, useCallback } from 'react';
import { getProviderRuleLint } from '../../api-client';
import type { ProviderRule, RuleLintReport } from '../../types';

interface ProviderRuleCardProps {
  rule: ProviderRule;
  providerId: string;
  lintRefreshKey?: number;
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
  providerId,
  lintRefreshKey = 0,
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
  const [expanded, setExpanded] = useState(false);
  const [lintReport, setLintReport] = useState<RuleLintReport | null>(null);
  const [lintLoading, setLintLoading] = useState(false);
  const [lintError, setLintError] = useState<string | null>(null);

  const fetchLint = useCallback(() => {
    setLintLoading(true);
    setLintError(null);
    getProviderRuleLint(providerId, rule.id)
      .then(setLintReport)
      .catch((err) => {
        setLintError((err as Error).message);
        setLintReport(null);
      })
      .finally(() => setLintLoading(false));
  }, [providerId, rule.id]);

  useEffect(() => {
    if (!expanded) return;
    fetchLint();
  }, [expanded, fetchLint, lintRefreshKey]);

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
      className={`server-card ${expanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={rule.id}
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
              <span className="server-name">{rule.name}</span>
              <span className="server-meta">{rule.id}{rule.extension}</span>
            </div>
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
          <button type="button" className="btn btn-sm" onClick={() => onEdit(rule.id)}>
            Edit
          </button>
          <button type="button" className="btn btn-sm" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="server-card-expanded">
          {lintLoading && (
            <div className="server-tools-loading">Validating rule…</div>
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
