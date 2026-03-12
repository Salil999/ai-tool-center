import { useState } from 'react';

export function CustomSyncModal({ onClose, onSync }) {
  const [path, setPath] = useState('');
  const [configKey, setConfigKey] = useState('mcpServers');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedPath = path.trim();
    if (!trimmedPath) return;
    await onSync(trimmedPath, configKey.trim() || 'mcpServers');
    onClose();
  };

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Custom Sync</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="custom-path">Config file path</label>
          <input
            type="text"
            id="custom-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="~/.my-tool/mcp.json"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="custom-key">Config key</label>
          <input
            type="text"
            id="custom-key"
            value={configKey}
            onChange={(e) => setConfigKey(e.target.value)}
            placeholder="mcpServers"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Sync
          </button>
        </div>
      </form>
    </div>
  );
}
