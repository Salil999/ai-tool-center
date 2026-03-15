import { useState, useEffect, useCallback } from 'react';
import {
  getProviders,
  updateEnabledProviders,
  deleteCustomProvider,
} from '../../api-client';
import type { BuiltinProvider, CustomProviderItem } from '../../api-client/providers';
import { AddCustomProviderModal } from './AddCustomProviderModal';
import { EditCustomProviderModal } from './EditCustomProviderModal';
import { Modal } from '@/components/shared/Modal';

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
  const [custom, setCustom] = useState<CustomProviderItem[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editProviderId, setEditProviderId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadProviders = useCallback(() => {
    getProviders()
      .then(({ builtin: b, custom: c }) => {
        setBuiltin(b);
        setCustom(c);
      })
      .catch(() => {});
  }, []);

  useEffect(() => loadProviders(), [loadProviders]);

  const getEnabledIds = useCallback(() => {
    return [
      ...builtin.filter((p) => p.enabled).map((p) => p.id),
      ...custom.filter((p) => p.enabled).map((p) => p.id),
    ];
  }, [builtin, custom]);

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

  const handleEdit = (p: CustomProviderItem) => setEditProviderId(p.id);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this custom provider?')) return;
    try {
      await deleteCustomProvider(id);
      onSuccess?.('Custom provider removed');
      loadProviders();
    } catch (err) {
      onError?.((err as Error).message);
    }
  };

  const editProvider = editProviderId ? custom.find((p) => p.id === editProviderId) : null;

  return (
    <div className="providers-tab">
      <p className="settings-description">
        Enable or disable providers. Enabled providers appear in sync dropdowns across MCP, Skills, and Rules tabs.
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
                <code className="provider-path" title={p.path}>
                  {p.path}
                </code>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-section" style={{ marginTop: '1.5rem' }}>
        <h3>Custom providers</h3>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setAddModalOpen(true)}
          style={{ marginBottom: '1rem' }}
        >
          Add Custom Provider
        </button>
        <ul className="providers-list settings-projects-list">
          {custom.map((p) => (
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
                <code className="provider-path" title={p.path}>
                  {p.path}
                </code>
                <div className="project-dir-actions">
                  <button type="button" className="btn btn-sm" onClick={() => handleEdit(p)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {custom.length === 0 && (
          <p className="project-directories-empty">No custom providers. Add one to sync MCP config to a custom file path.</p>
        )}
      </section>

      {onClose && (
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      )}

      {addModalOpen && (
        <Modal
          isOpen
          onClose={() => setAddModalOpen(false)}
          aria-labelledby="add-custom-provider-modal-title"
        >
          <AddCustomProviderModal
            onClose={() => setAddModalOpen(false)}
            onSaved={() => {
              setAddModalOpen(false);
              onSuccess?.('Custom provider added');
              loadProviders();
            }}
          />
        </Modal>
      )}

      {editProvider && (
        <Modal
          isOpen
          onClose={() => setEditProviderId(null)}
          aria-labelledby="edit-custom-provider-modal-title"
        >
          <EditCustomProviderModal
            provider={editProvider}
            onClose={() => setEditProviderId(null)}
            onSaved={() => {
              setEditProviderId(null);
              onSuccess?.('Custom provider updated');
              loadProviders();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
