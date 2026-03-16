import { useState, useEffect, useCallback } from 'react';
import {
  getHookProvidersMeta,
  getHooks,
  createHook,
  updateHook,
  deleteHook,
  reorderHooks,
  importHooks,
  syncHooks,
  type Hook,
  type HookScope,
  type HookProviderMeta,
} from '../../api-client/hooks';
import { getProjectDirectories } from '../../api-client/project-directories';
import { getProviders } from '../../api-client/providers';
import type { HookItem, ProjectDirectory } from '../../types';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/shared/Modal';
import { HookModal } from './HookModal';
import { useDragReorder } from '@/hooks/useDragReorder';

interface ScopeHooks {
  [key: string]: Hook[];
}

/** Provider shown in Hooks tab: either a real hook provider or OpenCode (plugins-only). */
type HooksTabProvider = HookProviderMeta | { id: 'opencode'; name: string };

const HOOKS_TAB_EXPANDED_KEY = 'hooks-tab-expanded-providers';

function scopeKey(providerId: string, scope: HookScope): string {
  if (scope.type === 'global') return `${providerId}:global`;
  if (scope.type === 'projectLocal') return `${providerId}:projectLocal:${scope.projectId}`;
  return `${providerId}:project:${scope.projectId}`;
}

export function HooksTab() {
  const { showToast } = useToast();
  const [providers, setProviders] = useState<HooksTabProvider[]>([]);
  const [projects, setProjects] = useState<ProjectDirectory[]>([]);
  const [hooksByScope, setHooksByScope] = useState<ScopeHooks>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const v = localStorage.getItem(HOOKS_TAB_EXPANDED_KEY);
      if (!v) return new Set<string>();
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? new Set(arr) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [editState, setEditState] = useState<{
    providerId: string;
    scope: HookScope;
    hook: Hook | null;
  } | null>(null);

  const loadAll = useCallback(async () => {
    const [allProviders, projectList, providersMeta] = await Promise.all([
      getProviders(),
      getProjectDirectories(),
      getHookProvidersMeta(),
    ]);

    const enabledIds = new Set(
      allProviders.builtin.filter((p) => p.enabled).map((p) => p.id)
    );
    const enabledHookProviders = providersMeta.filter((p) => enabledIds.has(p.id));

    const openCodeEnabled = allProviders.builtin.some((p) => p.id === 'opencode' && p.enabled);
    const providersList: HooksTabProvider[] = [...enabledHookProviders];
    if (openCodeEnabled) {
      providersList.push({ id: 'opencode', name: 'OpenCode' });
    }
    setProviders(providersList);
    setProjects(projectList);

    const fetches: Array<{ key: string; providerId: string; scope: HookScope }> = [];
    for (const provider of enabledHookProviders) {
      if (provider.supportsGlobalScope) {
        const globalScope: HookScope = { type: 'global' };
        fetches.push({ key: scopeKey(provider.id, globalScope), providerId: provider.id, scope: globalScope });
      }
      if (provider.supportsProjectScope) {
        for (const project of projectList) {
          const s: HookScope = { type: 'project', projectId: project.id };
          fetches.push({ key: scopeKey(provider.id, s), providerId: provider.id, scope: s });
        }
      }
      if (provider.supportsProjectLocalScope) {
        for (const project of projectList) {
          const s: HookScope = { type: 'projectLocal', projectId: project.id };
          fetches.push({ key: scopeKey(provider.id, s), providerId: provider.id, scope: s });
        }
      }
    }

    const results = await Promise.all(
      fetches.map(({ providerId, scope }) =>
        getHooks(providerId, scope).catch(() => [] as Hook[])
      )
    );

    const byScope: ScopeHooks = {};
    fetches.forEach(({ key }, i) => { byScope[key] = results[i]; });
    setHooksByScope(byScope);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // When providers change, drop any expanded IDs that no longer exist
  useEffect(() => {
    if (!providers.length) return;
    const validIds = new Set(providers.map((p) => p.id));
    setExpandedIds((prev) => {
      const filtered = [...prev].filter((id) => validIds.has(id));
      if (filtered.length === prev.size) return prev;
      try {
        localStorage.setItem(HOOKS_TAB_EXPANDED_KEY, JSON.stringify(filtered));
      } catch {
        /* ignore */
      }
      return new Set(filtered);
    });
  }, [providers]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(HOOKS_TAB_EXPANDED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(
    async (providerId: string, scope: HookScope, data: HookItem, existingId?: string) => {
      try {
        if (existingId) {
          await updateHook(providerId, scope, existingId, data);
          showToast('Hook updated');
        } else {
          await createHook(providerId, scope, data);
          showToast('Hook added');
        }
        setEditState(null);
        loadAll();
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [showToast, loadAll]
  );

  const handleDelete = useCallback(
    async (providerId: string, scope: HookScope, id: string) => {
      try {
        await deleteHook(providerId, scope, id);
        showToast('Hook deleted');
        loadAll();
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [showToast, loadAll]
  );

  const handleImport = useCallback(
    async (providerId: string, scope: HookScope) => {
      try {
        const result = await importHooks(providerId, scope);
        showToast(
          result.importedCount > 0
            ? `Imported ${result.importedCount} hook${result.importedCount === 1 ? '' : 's'}`
            : result.message ?? 'No hooks found'
        );
        loadAll();
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [showToast, loadAll]
  );

  const handleSync = useCallback(
    async (providerId: string, scope: HookScope) => {
      try {
        const result = await syncHooks(providerId, scope);
        showToast(`Synced ${result.syncedCount} hook${result.syncedCount === 1 ? '' : 's'} → ${result.path}`);
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [showToast]
  );

  const activeProvider = editState
    ? providers.find((p) => p.id === editState.providerId) ?? null
    : null;

  return (
    <>
      <div className="servers-section-header">
        <h2>Hooks</h2>
      </div>

      {providers.length === 0 && (
        <div className="empty-state">
          No hook-capable providers are enabled.
        </div>
      )}

      {providers.map((provider) => {
        const isExpanded = expandedIds.has(provider.id);
        const totalHooks = Object.entries(hooksByScope)
          .filter(([k]) => k.startsWith(`${provider.id}:`))
          .reduce((sum, [, hooks]) => sum + hooks.length, 0);

        return (
          <div key={provider.id} className="provider-rules-section hooks-provider-collapsible">
            <button
              type="button"
              className="hooks-provider-toggle"
              onClick={() => toggleExpanded(provider.id)}
              aria-expanded={isExpanded}
            >
              <span className="hooks-provider-chevron">{isExpanded ? '▼' : '▶'}</span>
              <h3 className="hooks-provider-title">{provider.name}</h3>
              {totalHooks > 0 && (
                <span className="skill-count-badge">{totalHooks}</span>
              )}
            </button>

            {isExpanded && (
              <div className="hooks-provider-body">
                {provider.id === 'opencode' ? (
                  <div className="hooks-opencode-info">
                    <p>
                      OpenCode does not support hooks. Instead, it uses <strong>plugins</strong> for
                      similar automation and extensibility. Plugins are npm packages that OpenCode
                      installs automatically at startup.
                    </p>
                    <p>
                      To manage OpenCode plugins, go to the{' '}
                      <a href="#plugins">Plugins</a> tab.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const p = provider as HookProviderMeta;
                    return (
                      <>
                        {p.supportsGlobalScope && (
                          <HookSection
                            title={p.id === 'cursor' ? 'User (Global)' : 'Global'}
                            subtitle={`Everywhere — syncs to ${p.userSettingsPath}`}
                            hooks={hooksByScope[scopeKey(p.id, { type: 'global' })] ?? []}
                            onAdd={() => setEditState({ providerId: p.id, scope: { type: 'global' }, hook: null })}
                            onEdit={(hook) => setEditState({ providerId: p.id, scope: { type: 'global' }, hook })}
                            onDelete={(id) => handleDelete(p.id, { type: 'global' }, id)}
                            onReorder={(order) => reorderHooks(p.id, { type: 'global' }, order).then(loadAll)}
                            onImport={() => handleImport(p.id, { type: 'global' })}
                            onSync={() => handleSync(p.id, { type: 'global' })}
                          />
                        )}

                        {p.supportsProjectScope && projects.map((project) => {
                          const scope: HookScope = { type: 'project', projectId: project.id };
                          const settingsFile = p.id === 'vscode'
                            ? `${project.path}/.github/hooks/hooks.json`
                            : p.id === 'cursor'
                              ? `${project.path}/.cursor/hooks.json`
                              : `${project.path}/.claude/settings.json`;
                          return (
                            <HookSection
                              key={`project-${project.id}`}
                              title={project.name ?? project.path}
                              subtitle={p.id === 'vscode' ? `Workspace — syncs to ${settingsFile}` : `Project — syncs to ${settingsFile}`}
                              hooks={hooksByScope[scopeKey(p.id, scope)] ?? []}
                              onAdd={() => setEditState({ providerId: p.id, scope, hook: null })}
                              onEdit={(hook) => setEditState({ providerId: p.id, scope, hook })}
                              onDelete={(id) => handleDelete(p.id, scope, id)}
                              onReorder={(order) => reorderHooks(p.id, scope, order).then(loadAll)}
                              onImport={() => handleImport(p.id, scope)}
                              onSync={() => handleSync(p.id, scope)}
                            />
                          );
                        })}

                        {p.supportsProjectLocalScope && projects.map((project) => {
                          const scope: HookScope = { type: 'projectLocal', projectId: project.id };
                          const settingsFile = p.id === 'claude'
                            ? `${project.path}/.claude/settings.local.json`
                            : '';
                          return (
                            <HookSection
                              key={`projectLocal-${project.id}`}
                              title={`${project.name ?? project.path} (Local)`}
                              subtitle={`Local — syncs to ${settingsFile}`}
                              hooks={hooksByScope[scopeKey(p.id, scope)] ?? []}
                              onAdd={() => setEditState({ providerId: p.id, scope, hook: null })}
                              onEdit={(hook) => setEditState({ providerId: p.id, scope, hook })}
                              onDelete={(id) => handleDelete(p.id, scope, id)}
                              onReorder={(order) => reorderHooks(p.id, scope, order).then(loadAll)}
                              onImport={() => handleImport(p.id, scope)}
                              onSync={() => handleSync(p.id, scope)}
                            />
                          );
                        })}

                        {p.supportsProjectScope && projects.length === 0 && (
                          <p className="tab-description" style={{ margin: 0 }}>
                            No projects configured. Add projects in Settings → Projects to manage project-scoped hooks.
                          </p>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        );
      })}

      {editState && activeProvider && activeProvider.id !== 'opencode' && (
        <Modal isOpen onClose={() => setEditState(null)} aria-labelledby="hook-modal-title">
          <HookModal
            hook={editState.hook}
            provider={activeProvider as HookProviderMeta}
            providerId={editState.providerId}
            scope={editState.scope}
            onClose={() => setEditState(null)}
            onSave={(data) =>
              handleSave(editState.providerId, editState.scope, data, editState.hook?.id)
            }
          />
        </Modal>
      )}
    </>
  );
}

// ── HookSection ───────────────────────────────────────────────────────────────

interface HookSectionProps {
  title: string;
  subtitle: string;
  hooks: Hook[];
  onAdd: () => void;
  onEdit: (hook: Hook) => void;
  onDelete: (id: string) => void;
  onReorder: (order: string[]) => void;
  onImport: () => Promise<void>;
  onSync: () => Promise<void>;
}

function HookSection({ title, subtitle, hooks, onAdd, onEdit, onDelete, onReorder, onImport, onSync }: HookSectionProps) {
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const drag = useDragReorder(hooks.map((h) => h.id), onReorder);

  return (
    <div className="hooks-scope-section">
      <div className="provider-rules-header" style={{ marginBottom: hooks.length > 0 ? '0.75rem' : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem' }}>{title}</h3>
          <p className="provider-rules-path-text">{subtitle}</p>
        </div>
        <div className="provider-rules-header-actions">
          <button
            type="button"
            className="btn btn-sm"
            disabled={importing}
            onClick={async () => { setImporting(true); try { await onImport(); } finally { setImporting(false); } }}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={syncing || hooks.length === 0}
            onClick={async () => { setSyncing(true); try { await onSync(); } finally { setSyncing(false); } }}
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={onAdd}>
            Add Hook
          </button>
        </div>
      </div>

      {hooks.length === 0 ? (
        <p className="empty-state" style={{ margin: 0 }}>
          No hooks.
        </p>
      ) : (
        <div className="server-list">
          {hooks.map((hook) => (
            <HookCard
              key={hook.id}
              hook={hook}
              isDragging={drag.draggedId === hook.id}
              isDropTarget={drag.dropTargetId === hook.id}
              onEdit={() => onEdit(hook)}
              onDelete={() => onDelete(hook.id)}
              onDragStart={() => drag.handleDragStart(hook.id)}
              onDragOver={(e) => drag.handleDragOver(e, hook.id)}
              onDragLeave={drag.handleDragLeave}
              onDrop={(e) => drag.handleDrop(e, hook.id)}
              onDragEnd={drag.handleDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── HookCard ──────────────────────────────────────────────────────────────────

interface HookCardProps {
  hook: Hook;
  isDragging: boolean;
  isDropTarget: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function HookCard({
  hook,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: HookCardProps) {
  const detail = hook.type === 'command' ? hook.command ?? ''
    : hook.type === 'http' ? hook.url ?? ''
    : hook.prompt ?? '';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', hook.id);
    onDragStart();
  };

  return (
    <div
      className={`server-card ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-id={hook.id}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="server-card-header">
        <div className="server-card-expand-trigger hooks-card-no-expand">
          <span
            className="server-card-drag-handle"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder"
            aria-label="Drag to reorder"
            role="button"
            tabIndex={0}
          >
            ⋮⋮
          </span>
          <div className="server-info skill-card-info">
            <div className="skill-name-row">
              <span className="hook-event-badge">{hook.event}</span>
              <span className={`hook-type-badge hook-type-badge--${hook.type}`}>{hook.type}</span>
              {hook.matcher && <span className="hook-matcher" title="Matcher">{hook.matcher}</span>}
              {hook.failClosed && <span className="hook-type-badge" title="Fail closed">fail-closed</span>}
            </div>
            {detail && (
              <span className="server-meta hook-card-detail" title={detail}>
                {detail}
              </span>
            )}
          </div>
        </div>
        <div className="server-actions">
          <button type="button" className="btn btn-sm" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn btn-sm" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
