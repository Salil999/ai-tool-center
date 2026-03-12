import { useState, useRef, useEffect } from 'react';

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

const TARGETS = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'claude', label: 'Claude' },
  { id: 'opencode', label: 'OpenCode' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'codex', label: 'Codex' },
  { id: 'gemini-cli', label: 'Gemini CLI' },
  { id: 'windsurf', label: 'Windsurf' },
  { id: 'antigravity', label: 'Antigravity' },
];

interface SyncSectionProps {
  onSync: (target: string) => void;
  onCustomSync: () => void;
}

export function SyncSection({ onSync, onCustomSync }: SyncSectionProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelect = (id: string) => {
    if (id === 'custom') {
      onCustomSync();
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
        Write
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
          {TARGETS.filter(({ label }) => fuzzyMatch(label, query)).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="sync-dropdown-item"
              onClick={() => handleSelect(id)}
            >
              {label}
            </button>
          ))}
          {fuzzyMatch('Custom', query) && (
            <button
              type="button"
              className="sync-dropdown-item sync-dropdown-item-custom"
              onClick={() => handleSelect('custom')}
            >
              Custom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
