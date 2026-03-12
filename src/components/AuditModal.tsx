import { useState, useEffect, useCallback, useMemo } from 'react';
import { diffLines } from 'diff';
import Fuse from 'fuse.js';
import { getAuditLog, getAuditOptions, setAuditOptions, clearAuditLog } from '../api';
import type { AuditEntry } from '../api';

function ConfigDiff({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const beforeStr = JSON.stringify(before, null, 2);
  const afterStr = JSON.stringify(after, null, 2);
  const changes = diffLines(beforeStr, afterStr);

  const renderBefore = () =>
    changes
      .filter((p) => !p.added)
      .map((part, i) => (
        <span key={i} className={part.removed ? 'audit-diff-removed' : ''}>
          {part.value}
        </span>
      ));

  const renderAfter = () =>
    changes
      .filter((p) => !p.removed)
      .map((part, i) => (
        <span key={i} className={part.added ? 'audit-diff-added' : ''}>
          {part.value}
        </span>
      ));

  return (
    <div className="audit-config-diff">
      <div className="audit-config-column">
        <h4>Before</h4>
        <pre className="audit-config-json">{renderBefore()}</pre>
      </div>
      <div className="audit-config-column">
        <h4>After</h4>
        <pre className="audit-config-json">{renderAfter()}</pre>
      </div>
    </div>
  );
}

function ContentDiff({ before, after }: { before: string; after: string }) {
  const changes = diffLines(before, after);

  const renderBefore = () =>
    changes
      .filter((p) => !p.added)
      .map((part, i) => (
        <span key={i} className={part.removed ? 'audit-diff-removed' : ''}>
          {part.value}
        </span>
      ));

  const renderAfter = () =>
    changes
      .filter((p) => !p.removed)
      .map((part, i) => (
        <span key={i} className={part.added ? 'audit-diff-added' : ''}>
          {part.value}
        </span>
      ));

  return (
    <div className="audit-config-diff">
      <div className="audit-config-column">
        <h4>Before</h4>
        <pre className="audit-config-json">{renderBefore()}</pre>
      </div>
      <div className="audit-config-column">
        <h4>After</h4>
        <pre className="audit-config-json">{renderAfter()}</pre>
      </div>
    </div>
  );
}

function formatDetailsForBadge(details: Record<string, unknown>): string {
  const skip = new Set(['contentBefore', 'contentAfter', 'contentPreview']);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (skip.has(k)) continue;
    if (Array.isArray(v)) {
      parts.push(`${k}: ${v.join(', ')}`);
    } else {
      parts.push(`${k}: ${String(v)}`);
    }
  }
  return parts.join(', ');
}

const ACTION_LABELS: Record<string, string> = {
  server_create: 'Server created',
  server_update: 'Server updated',
  server_delete: 'Server deleted',
  server_reorder: 'Servers reordered',
  server_enable_toggle: 'Server enabled/disabled',
  custom_providers_replace: 'Custom providers replaced',
  custom_provider_add: 'Custom provider added',
  import_custom: 'Imported from custom file',
  import_source: 'Imported from source',
  sync_to_provider: 'Synced to provider',
  sync_to_custom: 'Synced to custom path',
  audit_options_update: 'Audit options updated',
  config_change: 'Configuration changed',
  skill_create: 'Skill created',
  skill_update: 'Skill updated',
  skill_delete: 'Skill deleted',
  skill_content_update: 'Skill content updated',
  skill_reorder: 'Skills reordered',
  skill_enable_toggle: 'Skill enabled/disabled',
  skill_sync_to_provider: 'Skills synced to provider',
  skill_sync_to_project: 'Skills synced to project',
  skill_import_source: 'Skills imported from source',
  skill_import_custom: 'Skills imported from custom path',
  project_directory_add: 'Project directory added',
  project_directory_update: 'Project directory updated',
  project_directory_remove: 'Project directory removed',
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

/** Build searchable text from an audit entry for fuzzy search */
function entryToSearchable(entry: AuditEntry): string {
  const parts = [
    entry.action,
    formatAction(entry.action),
    entry.timestamp,
    entry.details ? formatDetailsForBadge(entry.details) : '',
    typeof entry.details?.contentPreview === 'string' ? entry.details.contentPreview : '',
  ];
  return parts.filter(Boolean).join(' ');
}

const ALL_EVENTS = '';

interface AuditModalProps {
  onClose: () => void;
}

export function AuditModal({ onClose }: AuditModalProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [maxEntries, setMaxEntries] = useState(100);
  const [maxEntriesInput, setMaxEntriesInput] = useState('100');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>(ALL_EVENTS);

  const uniqueActions = useMemo(() => {
    const seen = new Set<string>();
    return entries
      .map((e) => e.action)
      .filter((a) => {
        if (seen.has(a)) return false;
        seen.add(a);
        return true;
      })
      .sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (eventFilter !== ALL_EVENTS) {
      result = result.filter((e) => e.action === eventFilter);
    }

    if (searchQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: [{ name: 'searchable', getFn: (e) => entryToSearchable(e) }],
        threshold: 0.4,
      });
      result = fuse.search(searchQuery.trim()).map((r) => r.item);
    }

    return result;
  }, [entries, eventFilter, searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logRes, optsRes] = await Promise.all([getAuditLog(), getAuditOptions()]);
      setEntries(logRes.entries);
      setMaxEntries(optsRes.maxEntries);
      setMaxEntriesInput(String(optsRes.maxEntries));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveMaxEntries = async () => {
    const n = parseInt(maxEntriesInput, 10);
    if (isNaN(n) || n < 1) {
      setError('Max entries must be a number >= 1');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await setAuditOptions(n);
      setMaxEntries(res.maxEntries);
      setMaxEntriesInput(String(res.maxEntries));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all audit log entries? This cannot be undone.')) return;
    try {
      await clearAuditLog();
      setEntries([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="modal audit-modal">
      <div className="modal-header">
        <h2>Audit Log</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body audit-modal-body">
        <section className="audit-options-section">
          <h3>Options</h3>
          <div className="audit-options-row">
            <label htmlFor="audit-max-entries">
              Max entries to retain:
              <input
                id="audit-max-entries"
                type="number"
                min={1}
                max={10000}
                value={maxEntriesInput}
                onChange={(e) => setMaxEntriesInput(e.target.value)}
                className="audit-max-input"
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveMaxEntries}
              disabled={saving || maxEntriesInput === String(maxEntries)}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="audit-options-hint">
            When the limit is reached, oldest entries are removed. Current: {entries.length} entries.
          </p>
        </section>

        {error && (
          <div className="audit-error">
            {error}
          </div>
        )}

        <section className="audit-entries-section">
          <div className="audit-entries-header">
            <h3>Entries</h3>
            <button type="button" className="btn btn-sm" onClick={handleClear} disabled={entries.length === 0}>
              Clear log
            </button>
          </div>

          {!loading && entries.length > 0 && (
            <div className="audit-filters">
              <input
                type="search"
                placeholder="Search entries…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="audit-search-input"
                aria-label="Search audit entries"
              />
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="audit-event-select"
                aria-label="Filter by event type"
              >
                <option value={ALL_EVENTS}>All events</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {formatAction(action)}
                  </option>
                ))}
              </select>
              {(searchQuery || eventFilter !== ALL_EVENTS) && (
                <span className="audit-filter-hint">
                  {filteredEntries.length} of {entries.length} entries
                </span>
              )}
            </div>
          )}

          {loading ? (
            <p className="audit-loading">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="audit-empty">No audit entries yet.</p>
          ) : filteredEntries.length === 0 ? (
            <p className="audit-empty">No entries match your filters.</p>
          ) : (
            <div className="audit-entries-list">
              {filteredEntries.map((entry, idx) => {
                const id = `audit-${idx}-${entry.timestamp}`;
                const isExpanded = expandedId === id;
                return (
                  <div key={id} className="audit-entry">
                    <button
                      type="button"
                      className="audit-entry-header"
                      onClick={() => toggleExpand(id)}
                    >
                      <span className="audit-entry-chevron">{isExpanded ? '▼' : '▶'}</span>
                      <span className="audit-entry-time">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className="audit-entry-action">{formatAction(entry.action)}</span>
                      {entry.details && formatDetailsForBadge(entry.details) && (
                        <span className="audit-entry-details-badge">
                          {formatDetailsForBadge(entry.details)}
                        </span>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="audit-entry-body">
                        {entry.action === 'skill_content_update' &&
                        typeof entry.details?.contentBefore === 'string' &&
                        typeof entry.details?.contentAfter === 'string' ? (
                          <ContentDiff
                            before={entry.details.contentBefore}
                            after={entry.details.contentAfter}
                          />
                        ) : (
                          <ConfigDiff
                            before={entry.configBefore as Record<string, unknown>}
                            after={entry.configAfter as Record<string, unknown>}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
