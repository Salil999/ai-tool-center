import { useState, useEffect, useRef } from 'react';
import {
  getSubagentImportSources,
  importSubagentsFromSource,
  type SubagentImportSource,
  type ProjectSubagentSource,
} from '../../api-client';

/** Fuzzy match: query chars must appear in order in str (case-insensitive). */
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

function matchesQuery(s: SubagentImportSource, query: string): boolean {
  return fuzzyMatch(s.name, query) || fuzzyMatch(s.path, query);
}

function projectMatchesQuery(project: ProjectSubagentSource, query: string): boolean {
  if (fuzzyMatch(project.name, query) || fuzzyMatch(project.path, query)) return true;
  return project.sources.some((s) => matchesQuery(s, query));
}

interface ImportSubagentModalProps {
  onClose: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onError?: (msg: string) => void;
}

export function ImportSubagentModal({ onClose, onImport, onError }: ImportSubagentModalProps) {
  const [sources, setSources] = useState<{ providers: SubagentImportSource[]; projects: ProjectSubagentSource[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    getSubagentImportSources()
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) searchInputRef.current?.focus();
  }, [loading]);

  const handleImport = async (sourceId: string) => {
    setImporting(sourceId);
    try {
      const result = await importSubagentsFromSource(sourceId);
      onImport(result);
      onClose();
    } catch (err) {
      setImporting(null);
      onError?.((err as Error).message);
    }
  };

  const providers = sources?.providers ?? [];
  const projects = sources?.projects ?? [];
  const filteredProviders = providers.filter((s) => matchesQuery(s, query));
  const filteredProjects = projects.filter((p) => projectMatchesQuery(p, query));

  return (
    <div className="modal edit-modal import-modal">
      <div className="modal-header">
        <h2 id="import-subagent-modal-title">Import Subagents</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="import-intro">
          Import subagent definitions from provider directories (Claude Code, Cursor) or project directories.
          Files are copied into the central store at ~/.ai_tools_manager/subagents/
        </p>

        {loading ? (
          <p className="import-loading">Scanning for subagent directories…</p>
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
              className="import-project-collapse import-global-collapse"
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
                <span className="import-source-meta">
                  Home directory subagents (apply to all projects)
                </span>
              </summary>
              <div className="import-project-sources">
                {filteredProviders.map((s) => (
                  <div key={s.id} className="import-source-row import-source-row-nested">
                    <div className="import-source-info">
                      <span className="import-source-name">{s.name}</span>
                      <span className="import-source-meta">
                        {s.exists
                          ? `${s.agentCount} subagent${s.agentCount !== 1 ? 's' : ''}`
                          : 'Not found'}
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
                      disabled={!s.exists || s.agentCount === 0 || importing !== null}
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
                            {s.exists
                              ? `${s.agentCount} subagent${s.agentCount !== 1 ? 's' : ''}`
                              : 'Not found'}
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
                          disabled={!s.exists || s.agentCount === 0 || importing !== null}
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
