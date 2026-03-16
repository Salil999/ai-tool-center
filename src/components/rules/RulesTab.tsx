import { useState, useEffect, useCallback, useRef } from 'react';
import { AddAgentsModal } from './AddAgentsModal';
import { RuleEditorModal } from './RuleEditorModal';
import { ProviderRulesSection } from './ProviderRulesSection';
import { SyncConfirmModal } from '@/components/shared/SyncConfirmModal';
import {
  syncRulesTo,
  syncRulesToProject,
  getProjectDirectories,
  reorderProjectDirectories,
  getRuleProviders,
  getAgentRules,
  deleteAgentRule,
  autoImportProjectRules,
  autoImportGlobalRules,
} from '../../api-client';
import { useToast } from '@/contexts/ToastContext';
import { useDragReorder } from '@/hooks/useDragReorder';
import { Modal } from '@/components/shared/Modal';
import type { ProjectDirectory } from '@/types';

interface AgentRuleItem {
  id: string;
  projectPath: string;
  name?: string;
}

const RULES_TAB_OPEN_KEY = 'rules-tab-open-section';
const RULES_SECTION_ORDER_KEY = 'rules-section-order';

export function RulesTab() {
  const { showToast } = useToast();
  const [addAgentsForSection, setAddAgentsForSection] = useState<string | null>(null);
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
  const [agentRules, setAgentRules] = useState<AgentRuleItem[]>([]);
  const [editorAgent, setEditorAgent] = useState<AgentRuleItem | null>(null);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [pendingSyncAction, setPendingSyncAction] = useState<() => Promise<void>>(() => async () => {});
  const [importingProjectId, setImportingProjectId] = useState<string | null>(null);
  const [importingGlobal, setImportingGlobal] = useState(false);
  const autoImportedRef = useRef<Set<string>>(new Set());

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

  const loadAgentRules = useCallback(() => {
    getAgentRules().then(setAgentRules).catch(() => {});
  }, []);

  useEffect(() => loadProjects(), [loadProjects]);
  useEffect(() => loadRuleProviders(), [loadRuleProviders]);
  useEffect(() => loadAgentRules(), [loadAgentRules]);

  // Auto-import rules for each project on load
  useEffect(() => {
    if (!projects.length) return;
    for (const project of projects) {
      if (autoImportedRef.current.has(project.id)) continue;
      autoImportedRef.current.add(project.id);
      autoImportProjectRules(project.id)
        .then((result) => {
          if (result.imported.rules > 0 || result.imported.agents) {
            setRulesRefreshTrigger((t) => t + 1);
            loadAgentRules();
          }
        })
        .catch(() => {});
    }
  }, [projects, loadAgentRules]);

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

  // Section ordering: global + projects, stored in localStorage
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RULES_SECTION_ORDER_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const getSortedSectionIds = useCallback(() => {
    const allIds = ['global', ...projects.map((p) => p.id)];
    const ordered = sectionOrder.filter((id) => allIds.includes(id));
    const extra = allIds.filter((id) => !ordered.includes(id));
    return [...ordered, ...extra];
  }, [projects, sectionOrder]);

  const sortedSectionIds = getSortedSectionIds();

  const handleSectionReorder = async (order: string[]) => {
    setSectionOrder(order);
    try {
      localStorage.setItem(RULES_SECTION_ORDER_KEY, JSON.stringify(order));
    } catch { /* ignore */ }
    const projectOrder = order.filter((id) => id !== 'global');
    try {
      await reorderProjectDirectories(projectOrder);
      loadProjects();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const sectionDrag = useDragReorder(sortedSectionIds, handleSectionReorder);

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

  const requestSync = (action: () => Promise<void>) => {
    setPendingSyncAction(() => action);
    setSyncConfirmOpen(true);
  };

  const handleSyncAgentToProject = async (agentId: string) => {
    try {
      await syncRulesToProject(agentId, { sourceAgentId: agentId });
      showToast('AGENTS.md synced to project');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await deleteAgentRule(agentId);
      showToast('AGENTS.md removed');
      loadAgentRules();
      if (editorAgent?.id === agentId) setEditorAgent(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleImportGlobal = async () => {
    setImportingGlobal(true);
    try {
      const result = await autoImportGlobalRules();
      const count = result.imported.rules;
      showToast(count > 0 ? `Imported ${count} rule(s)` : 'No new rules found');
      setRulesRefreshTrigger((t) => t + 1);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setImportingGlobal(false);
    }
  };

  const handleImportProject = async (projectId: string) => {
    setImportingProjectId(projectId);
    try {
      const result = await autoImportProjectRules(projectId);
      const parts: string[] = [];
      if (result.imported.rules > 0) parts.push(`${result.imported.rules} rule(s)`);
      if (result.imported.agents) parts.push('AGENTS.md');
      showToast(parts.length > 0 ? `Imported ${parts.join(', ')}` : 'No new rules found');
      setRulesRefreshTrigger((t) => t + 1);
      loadAgentRules();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setImportingProjectId(null);
    }
  };

  /** Find agent rules that match a given project path */
  const getAgentsForProject = (projectPath: string) =>
    agentRules.filter((a) => a.projectPath === projectPath);

  /** Agent rules not tied to any known project — shown in Global section */
  const projectPaths = new Set(projects.map((p) => p.path));
  const globalAgents = agentRules.filter((a) => !projectPaths.has(a.projectPath));

  return (
    <>
      {syncConfirmOpen && (
        <SyncConfirmModal
          isOpen
          onClose={() => setSyncConfirmOpen(false)}
          onConfirm={pendingSyncAction}
        />
      )}
      <div className="servers-section-header">
        <h2>Rules</h2>
      </div>

      <div className="rules-tab-sections">
        {sortedSectionIds.map((sectionId) => {
          if (sectionId === 'global') {
            return (
              <details
                key="global"
                className={`import-project-collapse ${sectionDrag.draggedId === 'global' ? 'dragging' : ''} ${sectionDrag.dropTargetId === 'global' ? 'drop-target' : ''}`}
                open={openSectionId === 'global'}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('.project-summary-actions') || target.closest('.rules-drag-handle')) return;
                  if (target.closest('summary')) {
                    e.preventDefault();
                    toggleSection('global');
                  }
                }}
                onDragOver={(e) => sectionDrag.handleDragOver(e, 'global')}
                onDragLeave={sectionDrag.handleDragLeave}
                onDrop={(e) => sectionDrag.handleDrop(e, 'global')}
              >
                <summary className="import-project-summary rules-summary-left">
                  <span
                    className="rules-drag-handle"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', 'global');
                      sectionDrag.handleDragStart('global');
                    }}
                    onDragEnd={sectionDrag.handleDragEnd}
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                    role="button"
                    tabIndex={0}
                  >
                    ⋮⋮
                  </span>
                  <span className="import-source-name">Global</span>
                  <span className="import-source-meta">Home directory rules</span>
                  <div className="project-summary-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={importingGlobal}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportGlobal();
                      }}
                    >
                      {importingGlobal ? 'Importing…' : 'Import'}
                    </button>
                  </div>
                </summary>
                <div className="import-project-sources rules-tab-section-content">
                  <div className="provider-rules-section">
                    <div className="provider-rules-header">
                      <h3>AGENTS.md</h3>
                      <p className="provider-rules-desc">
                        Global AGENTS.md applies across all sessions. This is not supported by all providers.
                      </p>
                      <div className="provider-rules-header-actions">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddAgentsForSection('global')}>
                          Add AGENTS.md
                        </button>
                      </div>
                    </div>
                    {globalAgents.length === 0 ? (
                      <p className="rules-section-empty">
                      </p>
                    ) : (
                      <ul className="agents-project-list">
                        {globalAgents.map((a) => (
                          <li key={a.id} className="agents-project-item">
                            <span className="agents-project-name" title={a.projectPath}>
                              {a.name || 'AGENTS.md'}
                            </span>
                            <span className="import-source-meta import-source-path" title={a.projectPath}>
                              {a.projectPath}
                            </span>
                            <div className="agents-project-actions">
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setEditorAgent(a)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteAgent(a.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

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
                  </section>
                </div>
              </details>
            );
          }

          const project = projects.find((p) => p.id === sectionId);
          if (!project) return null;
          const projectAgents = getAgentsForProject(project.path);
          const hasAgents = projectAgents.length > 0;

          return (
            <details
              key={project.id}
              className={`import-project-collapse ${sectionDrag.draggedId === project.id ? 'dragging' : ''} ${sectionDrag.dropTargetId === project.id ? 'drop-target' : ''}`}
              open={openSectionId === project.id}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('.project-summary-actions') || target.closest('.rules-drag-handle')) return;
                if (target.closest('summary')) {
                  e.preventDefault();
                  toggleSection(project.id);
                }
              }}
              onDragOver={(e) => sectionDrag.handleDragOver(e, project.id)}
              onDragLeave={sectionDrag.handleDragLeave}
              onDrop={(e) => sectionDrag.handleDrop(e, project.id)}
            >
              <summary className="import-project-summary rules-summary-left">
                <span
                  className="rules-drag-handle"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', project.id);
                    sectionDrag.handleDragStart(project.id);
                  }}
                  onDragEnd={sectionDrag.handleDragEnd}
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
                <div className="project-summary-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={importingProjectId === project.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportProject(project.id);
                    }}
                  >
                    {importingProjectId === project.id ? 'Importing…' : 'Import'}
                  </button>
                </div>
              </summary>
              <div className="import-project-sources rules-tab-section-content">
                <div className="provider-rules-section">
                  <div className="provider-rules-header">
                    <h3>AGENTS.md</h3>
                    <p className="provider-rules-desc">
                      Cross-tool instructions. See{' '}
                      <a href="https://agents.md/" target="_blank" rel="noopener noreferrer">
                        agents.md
                      </a>.
                    </p>
                    {!hasAgents && (
                      <div className="provider-rules-header-actions">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddAgentsForSection(project.id)}>
                          Add AGENTS.md
                        </button>
                      </div>
                    )}
                  </div>
                  {projectAgents.length === 0 ? (
                    <p className="rules-section-empty">
                      No AGENTS.md for this project.
                    </p>
                  ) : (
                    <ul className="agents-project-list">
                      {projectAgents.map((a) => (
                        <li key={a.id} className="agents-project-item">
                          <span className="agents-project-name" title={a.projectPath}>
                            {a.name || 'AGENTS.md'}
                          </span>
                          <div className="agents-project-actions">
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => setEditorAgent(a)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() =>
                                requestSync(() => handleSyncAgentToProject(a.id))
                              }
                            >
                              Sync
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteAgent(a.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

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
          );
        })}
      </div>

      {addAgentsForSection && (
        <Modal isOpen onClose={() => setAddAgentsForSection(null)} aria-labelledby="add-agents-modal-title">
          <AddAgentsModal
            onClose={() => setAddAgentsForSection(null)}
            onSaved={() => {
              showToast('AGENTS.md added');
              loadAgentRules();
            }}
            defaultProjectPath={
              addAgentsForSection !== 'global'
                ? projects.find((p) => p.id === addAgentsForSection)?.path
                : undefined
            }
          />
        </Modal>
      )}

      {editorAgent && (
        <Modal isOpen onClose={() => setEditorAgent(null)} aria-labelledby="rule-editor-modal-title">
          <RuleEditorModal
            agentId={editorAgent.id}
            agentName={editorAgent.name || editorAgent.projectPath}
            onClose={() => setEditorAgent(null)}
            onSaved={() => {
              showToast('AGENTS.md updated');
            }}
          />
        </Modal>
      )}
    </>
  );
}
