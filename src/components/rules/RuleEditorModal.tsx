import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { getAgentsForAgent, saveAgentsForAgent } from '../../api-client';

function renderMarkdown(md: string): string {
  try {
    return marked.parse(md, { async: false });
  } catch {
    return `<p class="skill-preview-error">Failed to render markdown preview.</p>`;
  }
}

interface RuleEditorModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function RuleEditorModal({ agentId, agentName, onClose, onSaved }: RuleEditorModalProps) {
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setError(null);
    try {
      const { content: c } = await getAgentsForAgent(agentId);
      setContent(c);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setContentLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveAgentsForAgent(agentId, content);
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
        <h2 id="rule-editor-modal-title">Edit AGENTS.md — {agentName}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Edit the AGENTS.md content. This file provides AI coding agents with project-specific instructions. See{' '}
          <a href="https://agents.md/" target="_blank" rel="noopener noreferrer">
            agents.md
          </a>{' '}
          for the specification.
        </p>
        <div className="raw-editor-wrap skill-editor-wrap">
          {contentLoading ? (
            <p className="import-loading">Loading…</p>
          ) : showPreview ? (
            <div
              className="skill-editor-preview"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(content),
              }}
            />
          ) : (
            <textarea
              className="skill-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="Project setup, build instructions, code style, testing guidelines..."
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
        </div>

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
