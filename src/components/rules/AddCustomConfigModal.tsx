import { useState } from 'react';
import { createCustomRuleConfig } from '../../api-client';

interface AddCustomConfigModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddCustomConfigModal({ onClose, onSaved }: AddCustomConfigModalProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState<'file' | 'directory'>('directory');
  const [extension, setExtension] = useState<'.md' | '.mdc'>('.md');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = name.trim();
    const pathTrimmed = path.trim();
    if (!nameTrimmed) {
      setError('Name is required');
      return;
    }
    if (!pathTrimmed) {
      setError('Path is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCustomRuleConfig(nameTrimmed, pathTrimmed, type, extension);
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
        <h2 id="add-custom-config-modal-title">Add custom configuration</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <p className="skill-editor-desc">
          Add a custom rules configuration. Rules are stored in ~/.ai_tool_center and synced to your specified path.
        </p>

        <div className="form-group">
          <label htmlFor="custom-name">Name</label>
          <input
            id="custom-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My custom rules"
          />
        </div>

        <div className="form-group">
          <label htmlFor="custom-path">Sync path</label>
          <input
            id="custom-path"
            type="text"
            className="form-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="~/my-project/.rules or /path/to/rules"
          />
        </div>

        <div className="form-group">
          <label htmlFor="custom-type">Type</label>
          <select
            id="custom-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'file' | 'directory')}
          >
            <option value="directory">Directory (multiple .md/.mdc files)</option>
            <option value="file">Single file</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="custom-extension">File extension</label>
          <select
            id="custom-extension"
            value={extension}
            onChange={(e) => setExtension(e.target.value as '.md' | '.mdc')}
          >
            <option value=".md">.md</option>
            <option value=".mdc">.mdc</option>
          </select>
        </div>

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
