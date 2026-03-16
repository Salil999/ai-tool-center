import { useState, useEffect, useCallback } from 'react';
import { getProviders, updateEnabledProviders } from '../../api-client';
import type { BuiltinProvider } from '../../api-client/providers';

interface ProvidersTabProps {
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
  onClose?: () => void;
}

export function ProvidersTab({
  onError,
  onSuccess,
  onClose,
}: ProvidersTabProps) {
  const [builtin, setBuiltin] = useState<BuiltinProvider[]>([]);
  const [updating, setUpdating] = useState(false);

  const loadProviders = useCallback(() => {
    getProviders()
      .then(({ builtin: b }) => setBuiltin(b))
      .catch(() => {});
  }, []);

  useEffect(() => loadProviders(), [loadProviders]);

  const getEnabledIds = useCallback(() => {
    return builtin.filter((p) => p.enabled).map((p) => p.id);
  }, [builtin]);

  const handleToggle = async (id: string, enabled: boolean) => {
    const current = getEnabledIds();
    const next = enabled ? [...current, id] : current.filter((x) => x !== id);
    setUpdating(true);
    try {
      await updateEnabledProviders(next);
      onSuccess?.('Provider updated');
      loadProviders();
    } catch (err) {
      onError?.((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="providers-tab">
      <p className="settings-description">
        Enable or disable AI tool providers. Only enabled providers are available for configuration and sync.
      </p>

      <section className="settings-section" style={{ marginTop: '1rem' }}>
        <h3>Built-in providers</h3>
        <ul className="providers-list settings-projects-list">
          {builtin.map((p) => (
            <li key={p.id} className="provider-item settings-project-item">
              <div className="provider-item-top">
                <label className="provider-checkbox-label">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) => handleToggle(p.id, e.target.checked)}
                    disabled={updating}
                  />
                  <span className="provider-name">{p.name}</span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {onClose && (
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
