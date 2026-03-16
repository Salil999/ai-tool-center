import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { getSubagentContent, saveSubagentContent, lintSubagentContent } from '../../api-client';
import { SubagentLintReportsView } from './SubagentLintReports';
import type { SubagentLintReport } from '../../types';

type LintReportsMap = Record<string, SubagentLintReport>;

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

interface EditSubagentModalProps {
  subagentId: string;
  subagentName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSubagentModal({
  subagentId,
  subagentName,
  onClose,
  onSaved,
}: EditSubagentModalProps) {
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lintReports, setLintReports] = useState<LintReportsMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setError(null);
    try {
      const { content: c } = await getSubagentContent(subagentId);
      setContent(c);
      setLintReports(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setContentLoading(false);
    }
  }, [subagentId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const reports = await lintSubagentContent(subagentId, content);
      setLintReports(reports as LintReportsMap);
    } catch (err) {
      setError((err as Error).message);
      setLintReports(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveSubagentContent(subagentId, content);
      const reports = await lintSubagentContent(subagentId, content);
      setLintReports(reports as LintReportsMap);
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
        <h2 id="edit-subagent-modal-title">Edit Subagent — {subagentName}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Edit the subagent definition. YAML frontmatter configures the agent; the markdown body
          becomes the system prompt. See{' '}
          <a href="https://code.claude.com/docs/en/sub-agents" target="_blank" rel="noopener noreferrer">
            Claude Code
          </a>
          {', '}
          <a href="https://cursor.com/docs/subagents" target="_blank" rel="noopener noreferrer">
            Cursor
          </a>
          {', '}
          <a href="https://opencode.ai/docs/agents/" target="_blank" rel="noopener noreferrer">
            OpenCode
          </a>
          {', and '}
          <a href="https://code.visualstudio.com/docs/copilot/customization/custom-agents" target="_blank" rel="noopener noreferrer">
            VS Code
          </a>
          {' '}docs.
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
              placeholder="YAML frontmatter (name, description, model, etc.) followed by markdown system prompt"
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
        {lintReports && (
          <div className="skill-editor-lint">
            <SubagentLintReportsView reports={lintReports} />
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
