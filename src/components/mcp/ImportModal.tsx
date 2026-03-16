import { useState, useEffect, useRef } from 'react';
import { getImportSources, importFromSource } from '../../api-client';

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

interface ImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  serverCount: number;
  error?: string;
}

interface ImportModalProps {
  onClose: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onError?: (msg: string) => void;
}

export function ImportModal({ onClose, onImport, onError }: ImportModalProps) {
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    getImportSources()
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) searchInputRef.current?.focus();
  }, [loading]);

  const handleImport = async (sourceId: string) => {
    setImporting(sourceId);
    try {
      const result = await importFromSource(sourceId);
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
        <h2 id="import-modal-title">Import MCP Config</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="import-intro">
          Import servers from discovered configs or a custom JSON file. Existing servers are kept; new ones are merged in.
        </p>

        {loading ? (
          <p className="import-loading">Scanning for configs…</p>
        ) : (
          <div className="import-sources">
            <h3 className="import-section-title">Discovered configs</h3>
            <input
              ref={searchInputRef}
              type="text"
              className="import-search"
              placeholder="Search configs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search discovered configs"
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
                    {s.error
                      ? `Error: ${s.error}`
                      : s.exists
                        ? `${s.serverCount} server${s.serverCount !== 1 ? 's' : ''}`
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
                  disabled={!s.exists || s.serverCount === 0 || importing !== null}
                  onClick={() => handleImport(s.id)}
                >
                  {importing === s.id ? 'Importing…' : 'Import'}
                </button>
              </div>
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
