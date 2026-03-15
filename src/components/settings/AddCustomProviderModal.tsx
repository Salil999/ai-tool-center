import { useState } from 'react';
import { addCustomProvider } from '../../api-client';

interface AddCustomProviderModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddCustomProviderModal({ onClose, onSaved }: AddCustomProviderModalProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [configKey, setConfigKey] = useState('mcpServers');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addCustomProvider({
        name: name.trim(),
        path: path.trim(),
        configKey: configKey.trim() || 'mcpServers',
      });
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
        <h2 id="add-custom-provider-modal-title">Add Custom Provider</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Add a custom MCP config file path. The app will sync your MCP servers to this file when you select it in the Sync dropdown.
        </p>
        <div className="form-group">
          <label htmlFor="custom-provider-name">Name</label>
          <input
            id="custom-provider-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Custom Tool"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="custom-provider-path">Config file path</label>
          <input
            id="custom-provider-path"
            type="text"
            className="form-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. ~/.my-tool/mcp.json"
          />
        </div>
        <div className="form-group">
          <label htmlFor="custom-provider-configkey">Config key (optional)</label>
          <input
            id="custom-provider-configkey"
            type="text"
            className="form-input"
            value={configKey}
            onChange={(e) => setConfigKey(e.target.value)}
            placeholder="mcpServers"
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || !path.trim() || saving}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
