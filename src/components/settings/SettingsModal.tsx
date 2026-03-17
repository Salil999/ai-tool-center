import { useState, useRef, useEffect } from 'react';
import {
  resetConfig,
  exportConfig,
  importConfig,
  getTheme,
  setTheme,
} from '../../api-client';
import { ProjectsTab } from './ProjectsTab';
import { ProvidersTab } from './ProvidersTab';

type ThemeOption = 'dark' | 'light' | 'system';
type SettingsTabId = 'general' | 'projects' | 'providers';

interface SettingsModalProps {
  onClose: () => void;
  onReset?: () => void;
  onImport?: () => void;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
  initialTab?: SettingsTabId;
}

export function SettingsModal({
  onClose,
  onReset,
  onImport,
  onError,
  onSuccess,
  initialTab = 'general',
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [theme, setThemeState] = useState<ThemeOption>('dark');
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTheme = async () => {
    try {
      const { theme: t } = await getTheme();
      setThemeState(t);
    } catch {
      setThemeState('dark');
    } finally {
      setLoadingTheme(false);
    }
  };

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleThemeChange = async (value: ThemeOption) => {
    setThemeState(value);
    try {
      await setTheme(value);
      document.documentElement.dataset.theme = value;
    } catch (err) {
      onError?.((err as Error).message);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetConfig();
      setShowResetConfirm(false);
      onSuccess?.('All data has been reset.');
      onReset?.();
      onClose();
    } catch (err) {
      onError?.((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportConfig();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-tool-center-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onSuccess?.('Config exported successfully.');
    } catch (err) {
      onError?.((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { imported } = await importConfig(file);
      const parts: string[] = [];
      if (imported.servers > 0) parts.push(`${imported.servers} server(s)`);
      if (imported.skills > 0) parts.push(`${imported.skills} skill(s)`);
      if (imported.creds > 0) parts.push(`${imported.creds} credential(s)`);
      if ((imported.agents ?? 0) > 0) parts.push(`${imported.agents} AGENTS.md`);
      if ((imported.rules ?? 0) > 0) parts.push(`${imported.rules} rule(s)`);
      const msg = parts.length > 0 ? `Imported ${parts.join(', ')}` : 'Import complete — no new items found.';
      onSuccess?.(msg);
      onImport?.();
    } catch (err) {
      onError?.((err as Error).message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="modal settings-modal">
      <div className="modal-header">
        <h2 id="settings-modal-title">Settings</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-tabs">
        <button
          type="button"
          className={`modal-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`modal-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button
          type="button"
          className={`modal-tab ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          Providers
        </button>
      </div>
      <div className="modal-body settings-modal-body">
        {activeTab === 'general' && (
          <>
        <section className="settings-section">
          <h3>Theme</h3>
          <div className="settings-theme-options">
            {(['dark', 'light', 'system'] as const).map((opt) => (
              <label key={opt} className="settings-theme-option">
                <input
                  type="radio"
                  name="theme"
                  value={opt}
                  checked={theme === opt}
                  onChange={() => handleThemeChange(opt)}
                  disabled={loadingTheme}
                />
                <span>
                  {opt === 'dark' ? 'Dark' : opt === 'light' ? 'Light' : 'System'}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Export</h3>
          <p className="settings-description">
            Download all managed data as a JSON file for backup or migration.
          </p>
          <button
            type="button"
            className="btn"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </section>

        <section className="settings-section">
          <h3>Import</h3>
          <p className="settings-description">
            Restore from a previous export file. New items are merged with existing data.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn"
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </section>

        <section className="settings-section">
          <h3>Reset</h3>
          <p className="settings-description">
            Permanently delete all managed data. This cannot be undone.
          </p>
          {showResetConfirm ? (
            <div className="settings-reset-confirm">
              <p>Are you sure? This cannot be undone.</p>
              <div className="settings-reset-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleReset}
                  disabled={resetting}
                >
                  {resetting ? 'Resetting…' : 'Yes, reset everything'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowResetConfirm(true)}
            >
              Reset
            </button>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
          </>
        )}
        {activeTab === 'projects' && (
          <ProjectsTab onError={onError} onSuccess={onSuccess} onClose={onClose} />
        )}
        {activeTab === 'providers' && (
          <ProvidersTab onError={onError} onSuccess={onSuccess} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
