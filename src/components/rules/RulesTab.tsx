import { useState, useEffect, useCallback } from 'react';
import { ImportRuleModal } from './ImportRuleModal';
import { ProviderRulesSection } from './ProviderRulesSection';
import { CustomRulesSection } from './CustomRulesSection';
import {
  syncRulesTo,
  syncRulesToProject,
  getProjectDirectories,
  reorderProjectDirectories,
  getRuleProviders,
} from '../../api-client';
import { useToast } from '@/contexts/ToastContext';
import { useDragReorder } from '@/hooks/useDragReorder';
import { Modal } from '@/components/shared/Modal';
import type { ProjectDirectory } from '@/types';

const RULES_TAB_OPEN_KEY = 'rules-tab-open-section';

interface RulesTabProps {
  onOpenManageProjects?: () => void;
}

export function RulesTab({ onOpenManageProjects }: RulesTabProps) {
  const { showToast } = useToast();
  const [importModalOpen, setImportModalOpen] = useState(false);
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
  const [ruleProviders, setRuleProviders] = useState<Array<{ id: string; name: string }>>([]);

  const loadProjects = useCallback(() => {
    getProjectDirectories()
      .then(setProjects)
      .catch(() => {});
  }, []);

  const loadRuleProviders = useCallback(() => {
    getRuleProviders()
      .then(setRuleProviders)
      .catch(() => setRuleProviders([]));
  }, []);

  useEffect(() => loadProjects(), [loadProjects]);
  useEffect(() => loadRuleProviders(), [loadRuleProviders]);

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

  const projectIds = projects.map((p) => p.id);
  const projectDrag = useDragReorder(projectIds, handleProjectReorder);

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

  return (
    <>
      <div className="servers-section-header">
        <h2>Rules</h2>
        <div className="header-actions">
          {onOpenManageProjects && (
            <button
              type="button"
              className="btn"
              onClick={onOpenManageProjects}
            >
              Manage Projects
            </button>
          )}
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
              {ruleProviders
                .filter((p) => !p.id.startsWith('custom-'))
                .map((p) => (
                  <ProviderRulesSection
                    key={p.id}
                    providerId={p.id}
                    providerName={p.name}
                    onSync={handleSyncToProvider}
                    refreshTrigger={rulesRefreshTrigger}
                  />
                ))}
              <CustomRulesSection onSync={handleSyncToProvider} refreshTrigger={rulesRefreshTrigger} />
            </section>
          </div>
        </details>

        {projects.map((project) => (
          <details
            key={project.id}
            className={`import-project-collapse ${projectDrag.draggedId === project.id ? 'dragging' : ''} ${projectDrag.dropTargetId === project.id ? 'drop-target' : ''}`}
            open={openSectionId === project.id}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.project-summary-actions') || target.closest('.rules-drag-handle')) return;
              if (target.closest('summary')) {
                e.preventDefault();
                toggleSection(project.id);
              }
            }}
            onDragOver={(e) => projectDrag.handleDragOver(e, project.id)}
            onDragLeave={projectDrag.handleDragLeave}
            onDrop={(e) => projectDrag.handleDrop(e, project.id)}
          >
            <summary className="import-project-summary rules-summary-left">
              <span
                className="rules-drag-handle"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', project.id);
                  projectDrag.handleDragStart(project.id);
                }}
                onDragEnd={projectDrag.handleDragEnd}
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
            </summary>
            <div className="import-project-sources rules-tab-section-content">
              <section className="rules-section rules-section-providers">
                {ruleProviders
                  .filter((p) => !p.id.startsWith('custom-'))
                  .map((p) => (
                    <ProviderRulesSection
                      key={p.id}
                      providerId={p.id}
                      providerName={p.name}
                      onSync={handleSyncToProject(project.id)}
                      refreshTrigger={rulesRefreshTrigger}
                    />
                  ))}
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

    </>
  );
}
