import { useState, useEffect, useRef } from 'react';
import {
  getRuleImportSources,
  importRulesFromSource,
  importRulesFromProvider,
  importRulesFromCustomPath,
  getAgentRules,
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

interface RuleImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  hasContent: boolean;
  error?: string;
}

interface AgentRuleItem {
  id: string;
  projectPath: string;
  name?: string;
}

interface ImportRuleModalProps {
  onClose: () => void;
  onImport: () => void;
  onError?: (msg: string) => void;
}

export function ImportRuleModal({ onClose, onImport, onError }: ImportRuleModalProps) {
  const [sources, setSources] = useState<RuleImportSource[]>([]);
  const [agentRules, setAgentRules] = useState<AgentRuleItem[]>([]);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState('');

  useEffect(() => {
    Promise.all([getRuleImportSources(), getAgentRules()])
      .then(([s, a]) => {
        setSources(s);
        setAgentRules(a);
        if (a.length > 0 && !targetAgentId) {
          setTargetAgentId(a[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) searchInputRef.current?.focus();
  }, [loading]);

  const isProviderRulesSource = (id: string) => id === 'cursor' || id === 'augment';

  const handleImport = async (sourceId: string) => {
    if (isProviderRulesSource(sourceId)) {
      setImporting(sourceId);
      try {
        await importRulesFromProvider(sourceId);
        onImport();
        onClose();
      } catch (err) {
        setImporting(null);
        onError?.((err as Error).message);
      }
      return;
    }
    if (!targetAgentId) {
      onError?.('Select a target AGENTS.md first');
      return;
    }
    setImporting(sourceId);
    try {
      await importRulesFromSource(sourceId, targetAgentId);
      onImport();
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
    if (!targetAgentId) {
      onError?.('Select a target AGENTS.md first');
      return;
    }
    setImporting('custom');
    try {
      await importRulesFromCustomPath(path, targetAgentId);
      onImport();
      onClose();
    } catch (err) {
      setImporting(null);
      onError?.((err as Error).message);
    }
  };

  const canImportToAgents = targetAgentId && agentRules.length > 0;
  const canImport = (source: RuleImportSource) =>
    source.exists &&
    source.hasContent &&
    (isProviderRulesSource(source.id) || canImportToAgents);

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="import-rule-modal-title">Import Rules</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="import-intro">
          <strong>Cursor</strong> and <strong>Augment</strong>: Import directly into the Rules section (no AGENTS.md needed).
          Other sources: Import into a target AGENTS.md.
        </p>

        <div className="form-group">
          <label htmlFor="import-target-agent">Import into AGENTS.md (for non-provider sources)</label>
          <select
            id="import-target-agent"
            value={targetAgentId}
            onChange={(e) => setTargetAgentId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select AGENTS.md…</option>
            {agentRules.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.projectPath}
              </option>
            ))}
          </select>
          {agentRules.length === 0 && !loading && (
            <span className="form-hint">Add AGENTS.md to import from agent/project sources. Cursor and Augment import without this.</span>
          )}
        </div>

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
            {sources
              .filter((s) => fuzzyMatch(s.name, query) || fuzzyMatch(s.path, query))
              .map((s) => (
                <div key={s.id} className="import-source-row">
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
        )}

        <div className="import-custom">
          <h3 className="import-section-title">Custom file path</h3>
          <form onSubmit={handleCustomImport} className="import-custom-form">
            <div className="form-group">
              <label htmlFor="import-rule-path">File path (AGENTS.md or CLAUDE.md)</label>
              <input
                type="text"
                id="import-rule-path"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="~/my-project/AGENTS.md or /path/to/CLAUDE.md"
                disabled={importing !== null}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canImportToAgents || !customPath.trim() || importing !== null}
            >
              {importing === 'custom' ? 'Importing…' : 'Import from file'}
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
