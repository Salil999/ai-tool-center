import { useState, useEffect, useCallback } from 'react';
import { SkillList } from './SkillList';
import { SkillSyncSection } from './SkillSyncSection';
import { ProjectDirectoriesSection } from './ProjectDirectoriesSection';
import { AddSkillModal } from './AddSkillModal';
import { EditSkillModal } from './EditSkillModal';
import { ImportSkillModal } from './ImportSkillModal';
import {
  getSkills,
  deleteSkill,
  reorderSkills,
  setSkillEnabled,
  syncSkillsTo,
  syncSkillsToProject,
} from '../../api-client';
import type { Skill } from '../../types';

interface SkillsTabProps {
  showToast: (message: string, type?: string) => void;
}

export function SkillsTab({ showToast }: SkillsTabProps) {
  const [skills, setSkills] = useState<(Skill & { id: string })[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editSkillId, setEditSkillId] = useState<string | null>(null);
  const [lintRefreshKey, setLintRefreshKey] = useState(0);

  const loadSkills = useCallback(async () => {
    const list = await getSkills();
    setSkills(list as (Skill & { id: string })[]);
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleEdit = (id: string | undefined) => setEditSkillId(id ?? null);

  const handleDelete = async (id: string) => {
    await deleteSkill(id, true);
    showToast('Skill removed');
    loadSkills();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await setSkillEnabled(id, enabled);
    showToast(enabled ? 'Skill enabled' : 'Skill disabled');
    loadSkills();
  };

  const handleReorder = async (order: string[]) => {
    await reorderSkills(order);
    showToast('Order updated');
    loadSkills();
  };

  const handleSyncToProvider = async (target: string) => {
    const result = await syncSkillsTo(target);
    showToast(`Synced ${result.syncedCount} skill(s) to ${target}`);
  };

  const handleSyncToProject = async (projectId: string) => {
    const result = await syncSkillsToProject(projectId);
    showToast(`Synced ${result.syncedCount} skill(s) to project`);
  };

  const editSkill = editSkillId ? skills.find((s) => s.id === editSkillId) : null;

  return (
    <>
      <div className="servers-section-header">
        <h2>Skills</h2>
        <div className="header-actions">
          <SkillSyncSection
            onSyncToProvider={handleSyncToProvider}
            onSyncToProject={handleSyncToProject}
          />
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
            Add Skill
          </button>
        </div>
      </div>
      <SkillList
        skills={skills}
        lintRefreshKey={lintRefreshKey}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
        onReorder={handleReorder}
      />
      <ProjectDirectoriesSection />

      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AddSkillModal
              onClose={() => setAddModalOpen(false)}
              onSaved={() => loadSkills()}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="modal-overlay" onClick={() => setImportModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}

      {editSkill && (
        <div className="modal-overlay" onClick={() => setEditSkillId(null)}>
          <div onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}
    </>
  );
}
