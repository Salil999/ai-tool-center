import { useState } from 'react';
import { updateCustomProvider } from '../../api-client';
import type { CustomProviderItem } from '../../api-client/providers';

interface EditCustomProviderModalProps {
  provider: CustomProviderItem;
  onClose: () => void;
  onSaved: () => void;
}

export function EditCustomProviderModal({ provider, onClose, onSaved }: EditCustomProviderModalProps) {
  const [name, setName] = useState(provider.name);
  const [path, setPath] = useState(provider.path);
  const [configKey, setConfigKey] = useState(provider.configKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateCustomProvider(provider.id, {
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
        <h2 id="edit-custom-provider-modal-title">Edit Custom Provider</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="edit-custom-provider-name">Name</label>
          <input
            id="edit-custom-provider-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Custom Tool"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-custom-provider-path">Config file path</label>
          <input
            id="edit-custom-provider-path"
            type="text"
            className="form-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. ~/.my-tool/mcp.json"
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-custom-provider-configkey">Config key (optional)</label>
          <input
            id="edit-custom-provider-configkey"
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
