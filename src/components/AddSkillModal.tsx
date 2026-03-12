import { useState } from 'react';
import {
  createSkill,
  lintContent,
} from '../api';
import type { LintReport } from '../api';

const DEFAULT_SKILL_TEMPLATE = `---
name: my-skill
description: Add a description of what this skill does and when to use it.
---

`;

interface AddSkillModalProps {
  onClose: () => void;
  onSaved: () => void;
  showToast?: (message: string, type?: string) => void;
}

export function AddSkillModal({ onClose, onSaved, showToast }: AddSkillModalProps) {
  const [content, setContent] = useState(DEFAULT_SKILL_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [lintReport, setLintReport] = useState<LintReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const report = await lintContent(content);
      setLintReport(report);
    } catch (err) {
      setError((err as Error).message);
      setLintReport(null);
    } finally {
      setValidating(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createSkill({ content });
      showToast?.('Skill added');
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2>Add Skill</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleAdd}>
        <p className="skill-editor-desc">
          Create a new skill. Name and description go in the YAML frontmatter. See the{' '}
          <a
            href="https://agentskills.io/specification"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agent Skills specification
          </a>{' '}
          for format details.
        </p>
        <div className="raw-editor-wrap skill-editor-wrap">
          <textarea
            className="skill-editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            placeholder="YAML frontmatter (name, description) followed by markdown body"
          />
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={handleValidate}
          disabled={validating}
        >
          {validating ? 'Validating…' : 'Validate'}
        </button>
        {lintReport && (
          <div className="skill-editor-lint">
            <h4 className="skill-editor-lint-title">
              {lintReport.errors === 0 && lintReport.warnings === 0 ? (
                <span className="skill-lint-pass">✓ Passed validation</span>
              ) : (
                <span className="skill-lint-issues">
                  {lintReport.errors > 0 && (
                    <span className="skill-lint-error-count">
                      {lintReport.errors} error{lintReport.errors !== 1 ? 's' : ''}
                    </span>
                  )}
                  {lintReport.warnings > 0 && (
                    <span className="skill-lint-warning-count">
                      {lintReport.warnings} warning{lintReport.warnings !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              )}
            </h4>
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
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
