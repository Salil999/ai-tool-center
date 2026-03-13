import { useState } from 'react';
import { marked } from 'marked';
import { createAgentRule } from '../../api-client';

function renderMarkdown(md: string): string {
  try {
    return marked.parse(md, { async: false });
  } catch {
    return `<p class="skill-preview-error">Failed to render markdown preview.</p>`;
  }
}

interface AddAgentsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddAgentsModal({ onClose, onSaved }: AddAgentsModalProps) {
  const [projectPath, setProjectPath] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pathTrimmed = projectPath.trim();
    if (!pathTrimmed) {
      setError('Project path is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAgentRule(pathTrimmed, undefined, content);
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
        <h2 id="add-agents-modal-title">Add AGENTS.md</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Add an AGENTS.md for a project. Content is stored in <code>~/.ai_tools_manager</code> and can be synced to
          the project path. See{' '}
          <a href="https://agents.md/" target="_blank" rel="noopener noreferrer">
            agents.md
          </a>{' '}
          for the specification.
        </p>

        <div className="form-group">
          <label htmlFor="add-agents-path">Project path</label>
          <input
            id="add-agents-path"
            type="text"
            className="form-input"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="~/my-project or /path/to/project"
          />
        </div>

        <div className="form-group">
          <label>AGENTS.md content</label>
          <div className="raw-editor-wrap skill-editor-wrap">
            {showPreview ? (
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
        </div>
        <div className="skill-editor-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowPreview(!showPreview)}
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
            {saving ? 'Adding…' : 'Add AGENTS.md'}
          </button>
        </div>
      </form>
    </div>
  );
}
