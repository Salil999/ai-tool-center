import { useState } from 'react';
import { marked } from 'marked';
import { createProviderRule } from '../../api-client';

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

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2>Add Rule — {providerName}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Create a new rule file. For Cursor, use <code>.mdc</code> with frontmatter (description, globs, alwaysApply).
          For Augment, use <code>.md</code>. See{' '}
          <a href="https://cursor.com/docs/rules" target="_blank" rel="noopener noreferrer">
            Cursor rules
          </a>{' '}
          and{' '}
          <a href="https://docs.augmentcode.com/setup-augment/guidelines" target="_blank" rel="noopener noreferrer">
            Augment guidelines
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
              onChange={(e) => setContent(e.target.value)}
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
        </div>
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
