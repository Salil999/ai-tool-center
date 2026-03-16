import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { getProviderRuleContent, saveProviderRuleContent, lintProviderRuleContent } from '../../api-client';
import type { RuleLintReport } from '../../types';

function renderMarkdown(md: string): string {
  try {
    return marked.parse(md, { async: false });
  } catch {
    return `<p class="skill-preview-error">Failed to render markdown preview.</p>`;
  }
}

interface EditProviderRuleModalProps {
  providerId: string;
  providerName: string;
  ruleId: string;
  ruleName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProviderRuleModal({
  providerId,
  providerName,
  ruleId,
  ruleName,
  onClose,
  onSaved,
}: EditProviderRuleModalProps) {
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lintReport, setLintReport] = useState<RuleLintReport | null>(null);
  const [validating, setValidating] = useState(false);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setError(null);
    try {
      const { content: c } = await getProviderRuleContent(providerId, ruleId);
      setContent(c);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setContentLoading(false);
    }
  }, [providerId, ruleId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProviderRuleContent(providerId, ruleId, content);
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
      const report = await lintProviderRuleContent(providerId, ruleId, content);
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
        <h2 id="edit-provider-rule-modal-title">Edit Rule — {ruleName} ({providerName})</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <div className="raw-editor-wrap skill-editor-wrap">
          {contentLoading ? (
            <p className="import-loading">Loading…</p>
          ) : showPreview ? (
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
            />
          )}
        </div>
        <div className="skill-editor-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={contentLoading}
          >
            {showPreview ? 'Raw' : 'Preview'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleValidate}
            disabled={validating || contentLoading || !content.trim()}
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
