import { useState, useEffect, useCallback } from 'react';
import { SkillList } from './SkillList';
import { SkillSyncSection } from './SkillSyncSection';
import { AddSkillModal } from './AddSkillModal';
import { EditSkillModal } from './EditSkillModal';
import { ImportSkillModal } from './ImportSkillModal';
import {
  getSkills,
  deleteSkill,
  reorderSkills,
  syncSkillsTo,
  syncSkillsToProject,
} from '../../api-client';
import type { Skill } from '../../types';
import { useToast } from '@/contexts/ToastContext';
import { useSyncConfirmation } from '@/hooks/useSyncConfirmation';
import { Modal } from '@/components/shared/Modal';
import { SyncConfirmModal } from '@/components/shared/SyncConfirmModal';

export function SkillsTab({ onHelp, onSync }: { onHelp?: () => void; onSync?: () => void } = {}) {
  const { showToast } = useToast();
  const [skills, setSkills] = useState<(Skill & { id: string })[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editSkillId, setEditSkillId] = useState<string | null>(null);
  const [lintRefreshKey, setLintRefreshKey] = useState(0);
  const syncConfirm = useSyncConfirmation();

  const loadSkills = useCallback(async () => {
    const list = await getSkills();
    setSkills(list as (Skill & { id: string })[]);
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleEdit = (id: string | undefined) => setEditSkillId(id ?? null);

  const handleDelete = async (id: string) => {
    try {
      await deleteSkill(id, true);
      showToast('Skill removed');
      loadSkills();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReorder = async (order: string[]) => {
    try {
      await reorderSkills(order);
      showToast('Order updated');
      loadSkills();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSyncToProvider = async (target: string) => {
    try {
      const result = await syncSkillsTo(target);
      showToast(`Synced ${result.syncedCount} skill(s) to ${target}`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSyncToProject = async (projectId: string) => {
    try {
      const result = await syncSkillsToProject(projectId);
      showToast(`Synced ${result.syncedCount} skill(s) to project`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSyncToProviderRequest = (target: string) => {
    syncConfirm.requestSync(() => handleSyncToProvider(target));
  };

  const handleSyncToProjectRequest = (projectId: string) => {
    syncConfirm.requestSync(() => handleSyncToProject(projectId));
  };

  const editSkill = editSkillId ? skills.find((s) => s.id === editSkillId) : null;

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
        <h2>Skills</h2>
        <div className="header-actions">
          {onSync && <button type="button" className="btn" onClick={onSync}>Sync</button>}
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
            Add Skill
          </button>
          {onHelp && (
            <button type="button" className="btn btn-sm" onClick={onHelp} aria-label="Open user guide">?</button>
          )}
        </div>
      </div>
      <SkillList
        skills={skills}
        lintRefreshKey={lintRefreshKey}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {addModalOpen && (
        <Modal isOpen onClose={() => setAddModalOpen(false)} aria-labelledby="add-skill-modal-title">
          <AddSkillModal
            onClose={() => setAddModalOpen(false)}
            onSaved={() => loadSkills()}
          />
        </Modal>
      )}

      {importModalOpen && (
        <Modal isOpen onClose={() => setImportModalOpen(false)} aria-labelledby="import-skill-modal-title">
          <ImportSkillModal
              onClose={() => setImportModalOpen(false)}
              onImport={(result) => {
                const msg =
                  result.imported === 0
                    ? `No new skills (all already exist). Total: ${result.total}`
                    : `Imported ${result.imported} skill(s). Total: ${result.total}`;
                showToast(msg);
                loadSkills();
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
        </Modal>
      )}

      {editSkill && (
        <Modal isOpen onClose={() => setEditSkillId(null)} aria-labelledby="edit-skill-modal-title">
          <EditSkillModal
              skillId={editSkill.id}
              skillName={editSkill.name}
              onClose={() => setEditSkillId(null)}
              onSaved={() => {
                showToast('Skill updated');
                setLintRefreshKey((k) => k + 1);
                loadSkills();
              }}
            />
        </Modal>
      )}
    </>
  );
}
