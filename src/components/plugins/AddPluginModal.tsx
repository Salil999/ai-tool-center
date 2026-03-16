import { useState } from 'react';
import type { PluginProviderInfo } from '../../api-client/plugins';

interface AddPluginModalProps {
  providerId: string;
  provider: PluginProviderInfo;
  onClose: () => void;
  onAdd: (source: string) => void;
}

export function AddPluginModal({ provider, onClose, onAdd }: AddPluginModalProps) {
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = source.trim();
    if (!trimmed) {
      setError('Package name is required');
      return;
    }
    setError(null);
    onAdd(trimmed);
  };

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="add-plugin-modal-title">Add Plugin — {provider.name}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>×</button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="plugin-source">Package name</label>
          <input
            id="plugin-source"
            type="text"
            className="form-input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="opencode-helicone-session or @my-org/custom-plugin"
            autoFocus
          />
          {provider.id === 'opencode' && (
            <p className="form-hint">
              npm package name. OpenCode installs plugins automatically via Bun at startup.
              Packages are cached in <code>~/.cache/opencode/node_modules/</code>.
              For local plugins, place files in <code>~/.config/opencode/plugins/</code> instead.
            </p>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Add Plugin</button>
        </div>
      </form>
    </div>
  );
}
