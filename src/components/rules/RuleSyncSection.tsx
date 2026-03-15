import { useState, useEffect, useRef, useCallback } from 'react';
import { getRuleSyncTargets } from '../../api-client';

const AGENTS_PROVIDER_IDS = ['claude', 'gemini-cli', 'agents', 'opencode'];

/** Rule providers that support syncing to project directories */
const RULE_PROJECT_PROVIDER_IDS = ['cursor', 'augment', 'continue'];

function fuzzyMatch(str: string, query: string): boolean {
  if (!query.trim()) return true;
  const s = str.toLowerCase();
  const q = query.toLowerCase().trim();
  let si = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = s.indexOf(q[qi], si);
    if (idx === -1) return false;
    si = idx + 1;
  }
  return true;
}

interface AgentRuleItem {
  id: string;
  path: string;
  name?: string;
}

interface RuleSyncSectionProps {
  agentRules: AgentRuleItem[];
  onSyncToProvider: (target: string, sourceAgentId?: string) => void;
  onSyncToProject: (agentId: string, options?: { providerId?: string; sourceAgentId?: string }) => void;
  /** When false (Rules tab), hide AGENTS.md providers from the Sync dropdown */
  showAgentsTargets?: boolean;
}

export function RuleSyncSection({
  agentRules,
  onSyncToProvider,
  onSyncToProject,
  showAgentsTargets = true,
}: RuleSyncSectionProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [targets, setTargets] = useState<{
    providers: Array<{ id: string; name: string; path: string }>;
    projects: Array<{ id: string; name: string; path: string }>;
  }>({ providers: [], projects: [] });
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchTargets = useCallback(() => {
    getRuleSyncTargets().then(setTargets).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  useEffect(() => {
    if (open) {
      fetchTargets();
    }
  }, [open, fetchTargets]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      searchInputRef.current?.focus();
    }
  }, [open]);

  const handleSelectProvider = (id: string, sourceAgentId?: string) => {
    onSyncToProvider(id, sourceAgentId);
    setOpen(false);
  };

  const handleSelectProject = (
    id: string,
    options?: { providerId?: string; sourceAgentId?: string }
  ) => {
    onSyncToProject(id, options);
    setOpen(false);
  };

  const needsSourceAgent = (providerId: string) =>
    AGENTS_PROVIDER_IDS.includes(providerId);

  const allProviders = targets.providers.filter((p) => fuzzyMatch(p.name, query));
  const providers =
    showAgentsTargets ? allProviders : allProviders.filter((p) => !AGENTS_PROVIDER_IDS.includes(p.id));
  const filteredProjects = targets.projects.filter(
    (p) => fuzzyMatch(p.name, query) || fuzzyMatch(p.path, query)
  );

  return (
    <div className="sync-dropdown" ref={ref}>
      <button
        type="button"
        className="btn btn-sync-dropdown"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Sync
        <span className="sync-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="sync-dropdown-menu">
          <input
            ref={searchInputRef}
            type="text"
            className="sync-dropdown-search"
            placeholder="Search targets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Search sync targets"
          />
          {providers.length > 0 && (
            <>
              <div className="sync-dropdown-section-label">Providers</div>
              {providers.map(({ id, name }) =>
                needsSourceAgent(id) && agentRules.length > 0 ? (
                  <div key={id} className="sync-dropdown-project-group">
                    <div className="sync-dropdown-item sync-dropdown-sub-label">
                      {name} (from agent)
                    </div>
                    {agentRules.map((a) => (
                      <button
                        key={`${id}-${a.id}`}
                        type="button"
                        className="sync-dropdown-item sync-dropdown-sub"
                        onClick={() => handleSelectProvider(id, a.id)}
                      >
                        → {a.name || a.path}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    key={id}
                    type="button"
                    className="sync-dropdown-item"
                    onClick={() => handleSelectProvider(id)}
                  >
                    {name}
                  </button>
                )
              )}
            </>
          )}
          {filteredProjects.length > 0 && (
            <>
              <div className="sync-dropdown-section-label">Projects</div>
              {filteredProjects.map(({ id, name, path }) => (
                <div key={id} className="sync-dropdown-project-group">
                  <div className="sync-dropdown-item sync-dropdown-sub-label">
                    {name || path}
                  </div>
                  {agentRules
                    .filter((a: AgentRuleItem) => a.id !== id)
                    .map((a: AgentRuleItem) => (
                      <button
                        key={`agents-${id}-${a.id}`}
                        type="button"
                        className="sync-dropdown-item sync-dropdown-sub"
                        onClick={() =>
                          handleSelectProject(id, { sourceAgentId: a.id })
                        }
                      >
                        → AGENTS.md from {a.name || a.path}
                      </button>
                    ))}
                  {agentRules.filter((a: AgentRuleItem) => a.id !== id).length === 0 && (
                    <div className="sync-dropdown-item sync-dropdown-sub" style={{ color: 'var(--text-muted)' }}>
                      (Add another AGENTS.md to copy)
                    </div>
                  )}
                  {targets.providers
                    .filter((p) => RULE_PROJECT_PROVIDER_IDS.includes(p.id))
                    .map((p) => (
                      <button
                        key={`rules-${id}-${p.id}`}
                        type="button"
                        className="sync-dropdown-item sync-dropdown-sub"
                        onClick={() => handleSelectProject(id, { providerId: p.id })}
                      >
                        → {p.name}
                      </button>
                    ))}
                </div>
              ))}
            </>
          )}
          {providers.length === 0 && filteredProjects.length === 0 && (
            <div className="sync-dropdown-item" style={{ color: 'var(--text-muted)' }}>
              No targets
            </div>
          )}
        </div>
      )}
    </div>
  );
}
