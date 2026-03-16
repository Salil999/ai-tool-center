import { useState, useEffect, useRef } from 'react';
import {
  getSkillImportSources,
  importSkillsFromSource,
  importSkillsFromCustomPath,
  type SkillImportSource,
  type ProjectSkillSource,
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

function matchesQuery(s: SkillImportSource, query: string): boolean {
  return fuzzyMatch(s.name, query) || fuzzyMatch(s.path, query);
}

function projectMatchesQuery(project: ProjectSkillSource, query: string): boolean {
  if (fuzzyMatch(project.name, query) || fuzzyMatch(project.path, query)) return true;
  return project.sources.some((s) => matchesQuery(s, query));
}

interface ImportSkillModalProps {
  onClose: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onError?: (msg: string) => void;
}

const IMPORT_SKILL_OPEN_KEY = 'import-skill-modal-open';

export function ImportSkillModal({ onClose, onImport, onError }: ImportSkillModalProps) {
  const [sources, setSources] = useState<{ providers: SkillImportSource[]; projects: ProjectSkillSource[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState('');
  const [openSectionId, setOpenSectionId] = useState<string | null>(() => {
    try {
      const v = localStorage.getItem(IMPORT_SKILL_OPEN_KEY);
      return v || null;
    } catch {
      return null;
    }
  });

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => {
      const next = prev === id ? null : id;
      try {
        localStorage.setItem(IMPORT_SKILL_OPEN_KEY, next || '');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    getSkillImportSources()
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !sources) return;
    setOpenSectionId((prev) => {
      if (!prev) return null;
      if (prev === 'global') return prev;
      const projects = Array.isArray(sources) ? [] : sources?.projects ?? [];
      const projectExists = projects.some((p) => p.id === prev);
      return projectExists ? prev : null;
    });
  }, [loading, sources]);

  useEffect(() => {
    if (!loading) searchInputRef.current?.focus();
  }, [loading]);

  const handleImport = async (sourceId: string) => {
    setImporting(sourceId);
    try {
      const result = await importSkillsFromSource(sourceId);
      onImport(result);
      onClose();
    } catch (err) {
      setImporting(null);
      onError?.((err as Error).message);
    }
  };

  const handleCustomImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = customPath.trim();
    if (!path) return;
    setImporting('custom');
    try {
      const result = await importSkillsFromCustomPath(path);
      onImport(result);
      onClose();
    } catch (err) {
      setImporting(null);
      onError?.((err as Error).message);
    }
  };

  const providers = Array.isArray(sources) ? sources : sources?.providers ?? [];
  const projects = Array.isArray(sources) ? [] : sources?.projects ?? [];
  const filteredProviders = providers.filter((s) => matchesQuery(s, query));
  const filteredProjects = projects.filter((p) => projectMatchesQuery(p, query));

  return (
    <div className="modal edit-modal import-modal">
      <div className="modal-header">
        <h2 id="import-skill-modal-title">Import Skills</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="import-intro">
          Import skills from provider directories (Cursor, Claude, Gemini CLI, etc.) or project directories.
          Skills are copied into the central store at ~/.ai_tools_manager/skills/
        </p>

        {loading ? (
          <p className="import-loading">Scanning for skill directories…</p>
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
                  Home directory skills (apply to any app)
                </span>
              </summary>
              <div className="import-project-sources">
                {filteredProviders.map((s) => (
                  <div key={s.id} className="import-source-row import-source-row-nested">
                    <div className="import-source-info">
                      <span className="import-source-name">{s.name}</span>
                      <span className="import-source-meta">
                        {s.exists
                          ? `${s.skillCount} skill${s.skillCount !== 1 ? 's' : ''}`
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
                      disabled={!s.exists || s.skillCount === 0 || importing !== null}
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
                              ? `${s.skillCount} skill${s.skillCount !== 1 ? 's' : ''}`
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
                          disabled={!s.exists || s.skillCount === 0 || importing !== null}
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

        <div className="import-custom">
          <h3 className="import-section-title">Custom directory</h3>
          <form onSubmit={handleCustomImport} className="import-custom-form">
            <div className="form-group">
              <label htmlFor="import-skill-path">Directory path</label>
              <input
                type="text"
                id="import-skill-path"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="~/my-skills or /path/to/skills"
                disabled={importing !== null}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!customPath.trim() || importing !== null}
            >
              {importing === 'custom' ? 'Importing…' : 'Import from directory'}
            </button>
          </form>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
