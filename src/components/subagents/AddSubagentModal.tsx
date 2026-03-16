import { useState } from 'react';
import { marked } from 'marked';
import { createSubagent, validateSubagentContent } from '../../api-client';
import { SubagentLintReportsView } from './SubagentLintReports';
import { useToast } from '@/contexts/ToastContext';
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

const DEFAULT_TEMPLATE = `---
name: my-subagent
description: Describe when this subagent should be invoked and what it does.
---

You are a specialized agent that handles specific tasks.

## Instructions

Add your system prompt here.
`;

interface AddSubagentModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddSubagentModal({ onClose, onSaved }: AddSubagentModalProps) {
  const { showToast } = useToast();
  const [content, setContent] = useState(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lintReports, setLintReports] = useState<LintReportsMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const reports = await validateSubagentContent(content) as LintReportsMap;
      setLintReports(reports);
    } catch (err) {
      setError((err as Error).message);
      setLintReports(null);
    } finally {
      setValidating(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createSubagent({ content });
      showToast('Subagent added');
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal edit-modal add-skill-modal">
      <div className="modal-header">
        <h2 id="add-subagent-modal-title">Add Subagent</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleAdd}>
        <p className="skill-editor-desc">
          Create a new subagent. Uses YAML frontmatter for configuration and markdown body for the
          system prompt. See{' '}
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
          {' '}docs for provider-specific fields.
        </p>
        <div className="raw-editor-wrap skill-editor-wrap">
          {showPreview ? (
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
          >
            {showPreview ? 'Raw' : 'Preview'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleValidate}
            disabled={validating}
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
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
