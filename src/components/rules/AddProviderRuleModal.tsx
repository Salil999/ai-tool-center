import { useState } from 'react';
import { marked } from 'marked';
import { createProviderRule, validateRuleContent } from '../../api-client';
import type { RuleLintReport } from '../../types';

function renderMarkdown(md: string): string {
  try {
    return marked.parse(md, { async: false });
  } catch {
    return `<p class="skill-preview-error">Failed to render markdown preview.</p>`;
  }
}

interface AddProviderRuleModalProps {
  providerId: string;
  providerName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddProviderRuleModal({
  providerId,
  providerName,
  onClose,
  onSaved,
}: AddProviderRuleModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lintReport, setLintReport] = useState<RuleLintReport | null>(null);
  const [validating, setValidating] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createProviderRule(providerId, name.trim(), content);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setLintReport(null);
    try {
      const report = await validateRuleContent(providerId, content);
      setLintReport(report);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="add-provider-rule-modal-title">Add Rule — {providerName}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Create a new Cursor rule file. See{' '}
          <a href="https://cursor.com/docs/rules" target="_blank" rel="noopener noreferrer">
            Cursor rules
          </a>{' '}
          for format details.
        </p>
        <div className="form-group">
          <label htmlFor="rule-name">Rule name (filename)</label>
          <input
            id="rule-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. react-patterns"
            autoFocus
          />
        </div>
        <div className="raw-editor-wrap skill-editor-wrap">
          {showPreview ? (
            <div
              className="skill-editor-preview"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          ) : (
            <textarea
              className="skill-editor-textarea"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setLintReport(null);
              }}
              spellCheck={false}
              placeholder={'---\ndescription: "..."\nalwaysApply: false\n---\n\nRule content...'}
            />
          )}
        </div>
        <div className="skill-editor-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Raw' : 'Preview'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleValidate}
            disabled={validating || !content.trim()}
          >
            {validating ? 'Validating…' : 'Validate'}
          </button>
        </div>

        {lintReport && (
          <div className="rule-lint-inline">
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
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
