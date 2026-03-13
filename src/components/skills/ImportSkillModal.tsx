import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSkillImportSources,
  importSkillsFromSource,
  importSkillsFromCustomPath,
  searchSkillhubRegistry,
  installSkillFromRegistry,
  type SkillhubSkill,
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

interface SkillImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  skillCount: number;
  error?: string;
}

interface ImportSkillModalProps {
  onClose: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onError?: (msg: string) => void;
}

export function ImportSkillModal({ onClose, onImport, onError }: ImportSkillModalProps) {
  const [sources, setSources] = useState<SkillImportSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState('');

  const [registryQuery, setRegistryQuery] = useState('');
  const [registryResults, setRegistryResults] = useState<SkillhubSkill[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryInstalling, setRegistryInstalling] = useState<string | null>(null);

  useEffect(() => {
    getSkillImportSources()
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) searchInputRef.current?.focus();
  }, [loading]);

  const searchRegistry = useCallback(async (q: string) => {
    if (!q.trim()) {
      setRegistryResults([]);
      return;
    }
    setRegistryLoading(true);
    try {
      const { skills } = await searchSkillhubRegistry(q.trim(), 15);
      setRegistryResults(skills);
    } catch (err) {
      setRegistryResults([]);
      onError?.((err as Error).message);
    } finally {
      setRegistryLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    const t = setTimeout(() => searchRegistry(registryQuery), 300);
    return () => clearTimeout(t);
  }, [registryQuery, searchRegistry]);

  const handleRegistryInstall = async (skill: SkillhubSkill) => {
    const repoUrl = skill.repo_url;
    if (!repoUrl) {
      onError?.('No repo URL for this skill');
      return;
    }
    setRegistryInstalling(skill.slug);
    try {
      await installSkillFromRegistry(skill.slug, repoUrl);
      onImport({ imported: 1, total: 0 });
      onClose();
    } catch (err) {
      setRegistryInstalling(null);
      onError?.((err as Error).message);
    }
  };

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

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2>Import Skills</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="import-intro">
          Import skills from provider directories (Cursor, Claude, Gemini CLI, etc.) or project directories.
          Skills are copied into the central store at ~/.ai_tools_manager/skills/
        </p>

        <div className="import-registry">
          <h3 className="import-section-title">Search Skillhub Registry</h3>
          <input
            type="text"
            className="import-search"
            placeholder="Search 9,500+ skills…"
            value={registryQuery}
            onChange={(e) => setRegistryQuery(e.target.value)}
            aria-label="Search Skillhub registry"
          />
          {registryLoading && <p className="import-loading">Searching…</p>}
          {!registryLoading && registryQuery.trim() && registryResults.length === 0 && (
            <p className="import-empty">No skills found. Try a different search.</p>
          )}
          {!registryLoading && registryResults.length > 0 && (
            <div className="import-registry-results">
              {registryResults.map((s) => (
                <div key={s.id} className="import-source-row">
                  <div className="import-source-info">
                    <span className="import-source-name">{s.name}</span>
                    <span className="import-source-meta">
                      {s.author}
                      {s.github_stars != null && ` · ${s.github_stars.toLocaleString()} stars`}
                    </span>
                    {s.description && (
                      <span className="import-source-desc" title={s.description}>
                        {s.description.length > 150 ? `${s.description.slice(0, 150)}…` : s.description}
                      </span>
                    )}
                    {s.repo_url && (
                      <a
                        href={s.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="import-source-repo"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.repo_url.replace(/^https?:\/\//, '').split('#')[0]}
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={registryInstalling !== null}
                    onClick={() => handleRegistryInstall(s)}
                  >
                    {registryInstalling === s.slug ? 'Installing…' : 'Install'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
            {sources
              .filter(
                (s) =>
                  fuzzyMatch(s.name, query) || fuzzyMatch(s.path, query)
              )
              .map((s) => (
              <div key={s.id} className="import-source-row">
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
