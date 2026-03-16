import { useState, useEffect, useRef, useCallback } from 'react';
import { getSkillSyncTargets } from '../../api-client';

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

interface SkillSyncSectionProps {
  onSyncToProvider: (target: string) => void;
  onSyncToProject: (projectId: string) => void;
}

export function SkillSyncSection({ onSyncToProvider, onSyncToProject }: SkillSyncSectionProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [targets, setTargets] = useState<{
    providers: Array<{ id: string; name: string; path: string }>;
    projects: Array<{ id: string; name: string; path: string }>;
  }>({ providers: [], projects: [] });
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchTargets = useCallback(() => {
    getSkillSyncTargets().then(setTargets).catch(() => {});
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

  const handleSelectProvider = (id: string) => {
    onSyncToProvider(id);
    setOpen(false);
  };

  const handleSelectProject = (id: string) => {
    onSyncToProject(id);
    setOpen(false);
  };

  const providers = targets.providers.filter((p) => fuzzyMatch(p.name, query));
  const projects = targets.projects.filter((p) => fuzzyMatch(p.name, query) || fuzzyMatch(p.path, query));

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
              {providers.map(({ id, name }) => (
                <button
                  key={id}
                  type="button"
                  className="sync-dropdown-item"
                  onClick={() => handleSelectProvider(id)}
                >
                  {name}
                </button>
              ))}
            </>
          )}
          {projects.length > 0 && (
            <>
              <div className="sync-dropdown-section-label">Projects</div>
              {projects.map(({ id, name, path }) => (
                <button
                  key={id}
                  type="button"
                  className="sync-dropdown-item"
                  onClick={() => handleSelectProject(id)}
                >
                  {name || path}
                </button>
              ))}
            </>
          )}
          {providers.length === 0 && projects.length === 0 && (
            <div className="sync-dropdown-item" style={{ color: 'var(--text-muted)' }}>
              No targets
            </div>
          )}
        </div>
      )}
    </div>
  );
}
