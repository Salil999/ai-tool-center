import { useState, useEffect, useCallback } from 'react';
import { CredentialList } from './CredentialList';
import { AddCredentialModal } from './AddCredentialModal';
import { EditCredentialModal } from './EditCredentialModal';
import { getCredentials, deleteCredential, reorderCredentials } from '../../api-client';
import type { Credential } from '../../types';

interface CredentialsTabProps {
  showToast: (message: string, type?: string) => void;
}

export function CredentialsTab({ showToast }: CredentialsTabProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editCredentialId, setEditCredentialId] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    const list = await getCredentials();
    setCredentials(list);
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCredential(id);
      showToast('Credential deleted');
      loadCredentials();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReorder = async (order: string[]) => {
    try {
      await reorderCredentials(order);
      showToast('Order updated');
      loadCredentials();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <>
      <div className="servers-section-header">
        <h2>API Credentials</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddModalOpen(true)}
          >
            Add Credential
          </button>
        </div>
      </div>
      <CredentialList
        credentials={credentials}
        onEdit={(id) => setEditCredentialId(id)}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AddCredentialModal
              onClose={() => setAddModalOpen(false)}
              onSaved={loadCredentials}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {editCredentialId && (
        <div className="modal-overlay" onClick={() => setEditCredentialId(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <EditCredentialModal
              credentialId={editCredentialId}
              onClose={() => setEditCredentialId(null)}
              onSaved={() => {
                showToast('Credential updated');
                loadCredentials();
              }}
              showToast={showToast}
            />
          </div>
        </div>
      )}
    </>
  );
}
