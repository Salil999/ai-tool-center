import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { getSkillContent, saveSkillContent, lintSkillContent } from '../../api-client';

/** Extract markdown body after YAML frontmatter (--- ... ---) */
function getMarkdownBody(content: string): string {
  const match = content.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : content;
}

function renderMarkdown(md: string): string {
  try {
    return marked.parse(md, { async: false });
  } catch {
    return `<p class="skill-preview-error">Failed to render markdown preview.</p>`;
  }
}
import type { LintReport } from '../../types';

interface EditSkillModalProps {
  skillId: string;
  skillName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSkillModal({
  skillId,
  skillName,
  onClose,
  onSaved,
}: EditSkillModalProps) {
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lintReport, setLintReport] = useState<LintReport | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setError(null);
    try {
      const { content: c } = await getSkillContent(skillId);
      setContent(c);
      setLintReport(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setContentLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const report = await lintSkillContent(skillId, content);
      setLintReport(report);
    } catch (err) {
      setError((err as Error).message);
      setLintReport(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveSkillContent(skillId, content);
      const report = await lintSkillContent(skillId, content);
      setLintReport(report);
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
        <h2 id="edit-skill-modal-title">Edit Skill — {skillName}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Edit the SKILL.md content. Name and description are in the YAML frontmatter. See the{' '}
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
          {contentLoading ? (
            <p className="import-loading">Loading…</p>
          ) : showPreview ? (
            <div
              className="skill-editor-preview"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(getMarkdownBody(content)),
              }}
            />
          ) : (
            <textarea
              className="skill-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="YAML frontmatter (name, description) followed by markdown body"
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
            disabled={validating || contentLoading}
          >
            {validating ? 'Validating…' : 'Validate'}
          </button>
        </div>
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
