import { useState, useEffect, useCallback } from 'react';
import { ImportRuleModal } from './ImportRuleModal';
import { ProviderRulesSection } from './ProviderRulesSection';
import { CustomRulesSection } from './CustomRulesSection';
import { AddProjectModal } from '@/components/shared/AddProjectModal';
import { EditProjectModal } from '@/components/shared/EditProjectModal';
import {
  syncRulesTo,
  syncRulesToProject,
  getProjectDirectories,
  deleteProjectDirectory,
  reorderProjectDirectories,
} from '../../api-client';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/shared/Modal';
import type { ProjectDirectory } from '@/types';

const RULES_TAB_OPEN_KEY = 'rules-tab-open-section';

export function RulesTab() {
  const { showToast } = useToast();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectDirectory[]>([]);
  const [rulesRefreshTrigger, setRulesRefreshTrigger] = useState(0);
  const [openSectionId, setOpenSectionId] = useState<string | null>(() => {
    try {
      const v = localStorage.getItem(RULES_TAB_OPEN_KEY);
      return v || null;
    } catch {
      return null;
    }
  });
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    getProjectDirectories()
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => loadProjects(), [loadProjects]);

  useEffect(() => {
    if (!projects.length) return;
    setOpenSectionId((prev) => {
      if (!prev || prev === 'global') return prev;
      const exists = projects.some((p) => p.id === prev);
      return exists ? prev : null;
    });
  }, [projects]);

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => {
      const next = prev === id ? null : id;
      try {
        localStorage.setItem(RULES_TAB_OPEN_KEY, next || '');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleProjectReorder = async (order: string[]) => {
    try {
      await reorderProjectDirectories(order);
      showToast('Project order updated');
      loadProjects();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleProjectDragStart = (id: string) => setDraggedProjectId(id);
  const handleProjectDragEnd = () => {
    setDraggedProjectId(null);
    setDropTargetProjectId(null);
  };
  const handleProjectDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedProjectId && draggedProjectId !== id) setDropTargetProjectId(id);
  };
  const handleProjectDragLeave = () => setDropTargetProjectId(null);
  const handleProjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTargetProjectId(null);
    if (!draggedProjectId || draggedProjectId === targetId) return;
    const ids = projects.map((p) => p.id);
    const fromIndex = ids.indexOf(draggedProjectId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const newOrder = [...ids];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedProjectId);
    handleProjectReorder(newOrder);
  };

  const handleSyncToProvider = async (target: string) => {
    try {
      const result = await syncRulesTo(target);
      const count = result.syncedCount;
      showToast(
        count !== undefined
          ? `Synced ${count} rule(s) to ${target}`
          : `Rules synced to ${target}`
      );
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSyncToProject = (projectId: string) => async (providerId: string) => {
    try {
      const result = await syncRulesToProject(projectId, { providerId });
      const count = result.syncedCount;
      showToast(
        count !== undefined
          ? `Synced ${count} rule(s) to project`
          : 'Rules synced to project'
      );
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Remove this project directory?')) return;
    try {
      await deleteProjectDirectory(id);
      showToast('Project removed');
      loadProjects();
      if (openSectionId === id) {
        setOpenSectionId(null);
        try {
          localStorage.setItem(RULES_TAB_OPEN_KEY, '');
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const editProject = editProjectId ? projects.find((p) => p.id === editProjectId) : null;

  return (
    <>
      <div className="servers-section-header">
        <h2>Rules</h2>
        <div className="header-actions">
          <button type="button" className="btn" onClick={() => setAddProjectModalOpen(true)}>
            Add Project
          </button>
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
        </div>
      </div>

      <div className="rules-tab-sections">
        <details
          className="import-project-collapse"
          open={openSectionId === 'global'}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('summary') && !(e.target as HTMLElement).closest('.rules-drag-handle')) {
              e.preventDefault();
              toggleSection('global');
            }
          }}
        >
          <summary className="import-project-summary rules-summary-left">
            <span className="import-source-name">Global</span>
            <span className="import-source-meta">Home directory rules</span>
          </summary>
          <div className="import-project-sources rules-tab-section-content">
            <section className="rules-section rules-section-providers">
              <ProviderRulesSection
                providerId="cursor"
                providerName="Cursor Rules"
                onSync={handleSyncToProvider}
                refreshTrigger={rulesRefreshTrigger}
              />
              <ProviderRulesSection
                providerId="augment"
                providerName="Augment Rules"
                onSync={handleSyncToProvider}
                refreshTrigger={rulesRefreshTrigger}
              />
              <ProviderRulesSection
                providerId="windsurf"
                providerName="Windsurf Rules"
                onSync={handleSyncToProvider}
                refreshTrigger={rulesRefreshTrigger}
              />
              <ProviderRulesSection
                providerId="continue"
                providerName="Continue Rules"
                onSync={handleSyncToProvider}
                refreshTrigger={rulesRefreshTrigger}
              />
              <ProviderRulesSection
                providerId="copilot"
                providerName="GitHub Copilot Rules"
                onSync={handleSyncToProvider}
                refreshTrigger={rulesRefreshTrigger}
              />
              <CustomRulesSection onSync={handleSyncToProvider} refreshTrigger={rulesRefreshTrigger} />
            </section>
          </div>
        </details>

        {projects.map((project) => (
          <details
            key={project.id}
            className={`import-project-collapse ${draggedProjectId === project.id ? 'dragging' : ''} ${dropTargetProjectId === project.id ? 'drop-target' : ''}`}
            open={openSectionId === project.id}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.project-summary-actions') || target.closest('.rules-drag-handle')) return;
              if (target.closest('summary')) {
                e.preventDefault();
                toggleSection(project.id);
              }
            }}
            onDragOver={(e) => handleProjectDragOver(e, project.id)}
            onDragLeave={handleProjectDragLeave}
            onDrop={(e) => handleProjectDrop(e, project.id)}
          >
            <summary className="import-project-summary rules-summary-left">
              <span
                className="rules-drag-handle"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', project.id);
                  handleProjectDragStart(project.id);
                }}
                onDragEnd={handleProjectDragEnd}
                title="Drag to reorder"
                aria-label="Drag to reorder"
                role="button"
                tabIndex={0}
              >
                ⋮⋮
              </span>
              <span className="import-source-name">{project.name || project.path}</span>
              <span className="import-source-meta import-source-path" title={project.path}>
                {project.path.length > 50 ? `…${project.path.slice(-47)}` : project.path}
              </span>
              <span className="project-summary-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditProjectId(project.id);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                >
                  Remove
                </button>
              </span>
            </summary>
            <div className="import-project-sources rules-tab-section-content">
              <section className="rules-section rules-section-providers">
                <ProviderRulesSection
                  providerId="cursor"
                  providerName="Cursor Rules"
                  onSync={handleSyncToProject(project.id)}
                  refreshTrigger={rulesRefreshTrigger}
                  showSyncForCopilot
                />
                <ProviderRulesSection
                  providerId="augment"
                  providerName="Augment Rules"
                  onSync={handleSyncToProject(project.id)}
                  refreshTrigger={rulesRefreshTrigger}
                  showSyncForCopilot
                />
                <ProviderRulesSection
                  providerId="windsurf"
                  providerName="Windsurf Rules"
                  onSync={handleSyncToProject(project.id)}
                  refreshTrigger={rulesRefreshTrigger}
                  showSyncForCopilot
                />
                <ProviderRulesSection
                  providerId="continue"
                  providerName="Continue Rules"
                  onSync={handleSyncToProject(project.id)}
                  refreshTrigger={rulesRefreshTrigger}
                  showSyncForCopilot
                />
                <ProviderRulesSection
                  providerId="copilot"
                  providerName="GitHub Copilot Rules"
                  onSync={handleSyncToProject(project.id)}
                  refreshTrigger={rulesRefreshTrigger}
                  showSyncForCopilot
                />
              </section>
            </div>
          </details>
        ))}
      </div>

      {importModalOpen && (
        <Modal isOpen onClose={() => setImportModalOpen(false)} aria-labelledby="import-rule-modal-title">
          <ImportRuleModal
            onClose={() => setImportModalOpen(false)}
            onImport={() => {
              showToast('Rules imported');
              setRulesRefreshTrigger((t) => t + 1);
            }}
            onError={(msg) => showToast(msg, 'error')}
          />
        </Modal>
      )}

      {addProjectModalOpen && (
        <Modal isOpen onClose={() => setAddProjectModalOpen(false)} aria-labelledby="add-project-modal-title">
          <AddProjectModal
            onClose={() => setAddProjectModalOpen(false)}
            onSaved={() => {
              showToast('Project added');
              loadProjects();
            }}
          />
        </Modal>
      )}

      {editProject && (
        <Modal isOpen onClose={() => setEditProjectId(null)} aria-labelledby="edit-project-modal-title">
          <EditProjectModal
            projectId={editProject.id}
            initialPath={editProject.path}
            initialName={editProject.name || ''}
            onClose={() => setEditProjectId(null)}
            onSaved={() => {
              showToast('Project updated');
              loadProjects();
            }}
          />
        </Modal>
      )}
    </>
  );
}
