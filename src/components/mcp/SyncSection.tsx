import { useState, useRef, useEffect, useCallback } from 'react';
import { getSyncTargets } from '../../api-client';

/** Fuzzy match: query chars must appear in order in str (case-insensitive). */
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

interface SyncSectionProps {
  onSync: (target: string) => void;
  onCursorSync: () => void;
  onClaudeSync: () => void;
  onOpenCodeSync: () => void;
}

export function SyncSection({ onSync, onCursorSync, onClaudeSync, onOpenCodeSync }: SyncSectionProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [targets, setTargets] = useState<{ id: string; label: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadTargets = useCallback(() => {
    getSyncTargets()
      .then(({ builtin }) => {
        setTargets(builtin.map((p) => ({ id: p.id, label: p.name })));
      })
      .catch(() => setTargets([]));
  }, []);

  useEffect(() => loadTargets(), [loadTargets]);

  useEffect(() => {
    if (open) {
      loadTargets();
      setQuery('');
      searchInputRef.current?.focus();
    }
  }, [open, loadTargets]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    if (id === 'cursor') {
      onCursorSync();
    } else if (id === 'claude') {
      onClaudeSync();
    } else if (id === 'opencode') {
      onOpenCodeSync();
    } else {
      onSync(id);
    }
    setOpen(false);
  };

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
          {targets.filter(({ label }) => fuzzyMatch(label, query)).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="sync-dropdown-item"
              onClick={() => handleSelect(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
