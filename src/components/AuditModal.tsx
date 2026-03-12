import { useState, useEffect, useCallback } from 'react';
import { diffLines } from 'diff';
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
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

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

          {loading ? (
            <p className="audit-loading">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="audit-empty">No audit entries yet.</p>
          ) : (
            <div className="audit-entries-list">
              {entries.map((entry, idx) => {
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
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <span className="audit-entry-details-badge">
                          {Object.entries(entry.details)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(', ')}
                        </span>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="audit-entry-body">
                        <ConfigDiff
                          before={entry.configBefore as Record<string, unknown>}
                          after={entry.configAfter as Record<string, unknown>}
                        />
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
