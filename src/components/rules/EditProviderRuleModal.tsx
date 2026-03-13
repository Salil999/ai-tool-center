import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { getProviderRuleContent, saveProviderRuleContent } from '../../api-client';

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

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2>Edit Rule — {ruleName} ({providerName})</h2>
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
              onChange={(e) => setContent(e.target.value)}
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
