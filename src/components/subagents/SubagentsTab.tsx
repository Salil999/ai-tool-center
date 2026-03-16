import { useState, useEffect, useCallback } from 'react';
import { SubagentList } from './SubagentList';
import { SubagentSyncSection } from './SubagentSyncSection';
import { AddSubagentModal } from './AddSubagentModal';
import { EditSubagentModal } from './EditSubagentModal';
import { ImportSubagentModal } from './ImportSubagentModal';
import {
  getSubagents,
  deleteSubagent,
  reorderSubagents,
  setSubagentEnabled,
  syncSubagentsTo,
} from '../../api-client';
import type { Subagent } from '../../types';
import { useToast } from '@/contexts/ToastContext';
import { useSyncConfirmation } from '@/hooks/useSyncConfirmation';
import { Modal } from '@/components/shared/Modal';
import { SyncConfirmModal } from '@/components/shared/SyncConfirmModal';

export function SubagentsTab() {
  const { showToast } = useToast();
  const [subagents, setSubagents] = useState<(Subagent & { id: string })[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editSubagentId, setEditSubagentId] = useState<string | null>(null);
  const [lintRefreshKey, setLintRefreshKey] = useState(0);
  const syncConfirm = useSyncConfirmation();

  const loadSubagents = useCallback(async () => {
    const list = await getSubagents();
    setSubagents(list as unknown as (Subagent & { id: string })[]);
  }, []);

  useEffect(() => {
    loadSubagents();
  }, [loadSubagents]);

  const handleEdit = (id: string) => setEditSubagentId(id);

  const handleDelete = async (id: string) => {
    try {
      await deleteSubagent(id);
      showToast('Subagent removed');
      loadSubagents();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await setSubagentEnabled(id, enabled);
      showToast(enabled ? 'Subagent enabled' : 'Subagent disabled');
      loadSubagents();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReorder = async (order: string[]) => {
    try {
      await reorderSubagents(order);
      showToast('Order updated');
      loadSubagents();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSyncTo = async (targetId: string) => {
    try {
      const result = await syncSubagentsTo(targetId);
      showToast(`Synced ${result.syncedCount} subagent(s)`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSyncRequest = (targetId: string) => {
    syncConfirm.requestSync(() => handleSyncTo(targetId));
  };

  const editSubagent = editSubagentId ? subagents.find((s) => s.id === editSubagentId) : null;

  return (
    <>
      {syncConfirm.isOpen && (
        <SyncConfirmModal
          isOpen
          onClose={syncConfirm.cancel}
          onConfirm={syncConfirm.confirm}
        />
      )}
      <div className="servers-section-header">
        <h2>Subagents</h2>
        <div className="header-actions">
          <SubagentSyncSection
            onSyncToProvider={handleSyncRequest}
            onSyncToProject={handleSyncRequest}
          />
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
            Add Subagent
          </button>
        </div>
      </div>
      <SubagentList
        subagents={subagents}
        lintRefreshKey={lintRefreshKey}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
        onReorder={handleReorder}
      />

      {addModalOpen && (
        <Modal isOpen onClose={() => setAddModalOpen(false)} aria-labelledby="add-subagent-modal-title">
          <AddSubagentModal
            onClose={() => setAddModalOpen(false)}
            onSaved={() => loadSubagents()}
          />
        </Modal>
      )}

      {importModalOpen && (
        <Modal isOpen onClose={() => setImportModalOpen(false)} aria-labelledby="import-subagent-modal-title">
          <ImportSubagentModal
            onClose={() => setImportModalOpen(false)}
            onImport={(result) => {
              const msg =
                result.imported === 0
                  ? `No new subagents (all already exist). Total: ${result.total}`
                  : `Imported ${result.imported} subagent(s). Total: ${result.total}`;
              showToast(msg);
              loadSubagents();
            }}
            onError={(msg) => showToast(msg, 'error')}
          />
        </Modal>
      )}

      {editSubagent && (
        <Modal isOpen onClose={() => setEditSubagentId(null)} aria-labelledby="edit-subagent-modal-title">
          <EditSubagentModal
            subagentId={editSubagent.id}
            subagentName={editSubagent.name}
            onClose={() => setEditSubagentId(null)}
            onSaved={() => {
              showToast('Subagent updated');
              setLintRefreshKey((k) => k + 1);
              loadSubagents();
            }}
          />
        </Modal>
      )}
    </>
  );
}
