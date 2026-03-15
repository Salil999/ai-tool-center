import { useState, useEffect, useRef } from 'react';
import {
  getRuleImportSources,
  importRulesFromProvider,
  type RuleImportSource,
  type ProjectRuleSource,
  type RuleImportSourcesResponse,
} from '../../api-client';

function fuzzyMatch(str: string, query: string): boolean {
  if (!query.trim()) return true;
  const s = (str || '').toLowerCase();
  const q = query.toLowerCase().trim();
  let si = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = s.indexOf(q[qi], si);
    if (idx === -1) return false;
    si = idx + 1;
  }
  return true;
}

function matchesQuery(s: RuleImportSource, query: string): boolean {
  return fuzzyMatch(s.name, query) || fuzzyMatch(s.path, query);
}

function projectMatchesQuery(project: ProjectRuleSource, query: string): boolean {
  if (fuzzyMatch(project.name, query) || fuzzyMatch(project.path, query)) return true;
  return project.sources.some((s) => matchesQuery(s, query));
}

const PROVIDER_IDS = ['cursor', 'augment', 'continue'];
const PROJECT_PROVIDER_KEYS = ['cursor', 'augment', 'continue'];

function isProviderImportSource(id: string): boolean {
  if (PROVIDER_IDS.includes(id)) return true;
  const m = id.match(/^project-.+__(.+)$/);
  return m ? PROJECT_PROVIDER_KEYS.includes(m[1]) : false;
}

const RULES_IMPORT_OPEN_KEY = 'import-rules-modal-open';

interface ImportRuleModalProps {
  onClose: () => void;
  onImport: () => void;
  onError?: (msg: string) => void;
}

export function ImportRuleModal({ onClose, onImport, onError }: ImportRuleModalProps) {
  const [sources, setSources] = useState<RuleImportSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(RULES_IMPORT_OPEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => {
      const next = prev === id ? null : id;
      try {
        localStorage.setItem(RULES_IMPORT_OPEN_KEY, next || '');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    getRuleImportSources()
      .then((data) => {
        const normalized = Array.isArray(data)
          ? { providers: data, projects: [] }
          : data;
        setSources(normalized);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !sources) return;
    setOpenSectionId((prev) => {
      if (!prev) return null;
      if (prev === 'global') return prev;
      const projectExists = (sources.projects ?? []).some((p) => p.id === prev);
      return projectExists ? prev : null;
    });
  }, [loading, sources]);

  useEffect(() => {
    if (!loading) searchInputRef.current?.focus();
  }, [loading]);

  const handleImport = async (sourceId: string) => {
    if (!isProviderImportSource(sourceId)) {
      onError?.('This source is not supported for rules import');
      return;
    }
    setImporting(sourceId);
    try {
      await importRulesFromProvider(sourceId);
      onImport();
      onClose();
    } catch (err) {
      setImporting(null);
      onError?.((err as Error).message);
    }
  };

  const canImport = (source: RuleImportSource) => source.exists && source.hasContent;

  const providers = sources?.providers ?? [];
  const projects = sources?.projects ?? [];
  const filteredProviders = providers.filter((s) => matchesQuery(s, query));
  const filteredProjects = projects.filter((p) => projectMatchesQuery(p, query));

  return (
    <div className="modal edit-modal import-modal">
      <div className="modal-header">
        <h2 id="import-rule-modal-title">Import Rules</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="import-intro">
          Import rules from <strong>Cursor</strong>, <strong>Augment</strong>, or{' '}
          <strong>Continue</strong> into the Rules section. AGENTS.md is managed separately on the AGENTS.md tab.
        </p>

        {loading ? (
          <p className="import-loading">Scanning for rule sources…</p>
        ) : (
          <div className="import-sources">
            <h3 className="import-section-title">Discovered sources</h3>
            <input
              ref={searchInputRef}
              type="text"
              className="import-search"
              placeholder="Search sources…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search discovered sources"
            />
            <details
              className="import-project-collapse"
              open={openSectionId === 'global'}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('summary')) {
                  e.preventDefault();
                  toggleSection('global');
                }
              }}
            >
              <summary className="import-project-summary">
                <span className="import-source-name">Global</span>
                <span className="import-source-meta">Home directory rules</span>
              </summary>
              <div className="import-project-sources">
                {filteredProviders.map((s) => (
                  <div key={s.id} className="import-source-row import-source-row-nested">
                    <div className="import-source-info">
                      <span className="import-source-name">{s.name}</span>
                      <span className="import-source-meta">
                        {s.exists ? (s.hasContent ? 'Has content' : 'Empty') : 'Not found'}
                        {s.path && (
                          <span className="import-source-path" title={s.path}>
                            {s.path.length > 50 ? `…${s.path.slice(-47)}` : s.path}
                          </span>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={!canImport(s) || importing !== null}
                      onClick={() => handleImport(s.id)}
                    >
                      {importing === s.id ? 'Importing…' : 'Import'}
                    </button>
                  </div>
                ))}
              </div>
            </details>
            {filteredProjects.map((project) => (
              <details
                key={project.id}
                className="import-project-collapse"
                open={openSectionId === project.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('summary')) {
                    e.preventDefault();
                    toggleSection(project.id);
                  }
                }}
              >
                <summary className="import-project-summary">
                  <span className="import-source-name">{project.name}</span>
                  <span className="import-source-meta">
                    <span className="import-source-path" title={project.path}>
                      {project.path.length > 50 ? `…${project.path.slice(-47)}` : project.path}
                    </span>
                  </span>
                </summary>
                <div className="import-project-sources">
                  {project.sources
                    .filter((s) => !query.trim() || matchesQuery(s, query))
                    .map((s) => (
                      <div key={s.id} className="import-source-row import-source-row-nested">
                        <div className="import-source-info">
                          <span className="import-source-name">{s.name}</span>
                          <span className="import-source-meta">
                            {s.exists ? (s.hasContent ? 'Has content' : 'Empty') : 'Not found'}
                            {s.path && (
                              <span className="import-source-path" title={s.path}>
                                {s.path.length > 50 ? `…${s.path.slice(-47)}` : s.path}
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={!canImport(s) || importing !== null}
                          onClick={() => handleImport(s.id)}
                        >
                          {importing === s.id ? 'Importing…' : 'Import'}
                        </button>
                      </div>
                    ))}
                </div>
              </details>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
