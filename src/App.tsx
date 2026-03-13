import { useState, useCallback, useEffect } from 'react';
import { ServerList } from './components/mcp/ServerList';
import { EditModal } from './components/mcp/EditModal';
import { SyncSection } from './components/mcp/SyncSection';
import { CustomSyncModal } from './components/mcp/CustomSyncModal';
import { ImportModal } from './components/mcp/ImportModal';
import { InfoModal } from './components/shared/InfoModal';
import { AuditModal } from './components/shared/AuditModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { Toast } from './components/shared/Toast';
import { getTheme } from './api-client';
import { SkillsTab } from './components/skills/SkillsTab';
import { CredentialsTab } from './components/credentials/CredentialsTab';
import { useMcpServers } from './hooks/useMcpServers';
import { useOAuthCallback } from './hooks/useOAuthCallback';

type TabId = 'mcp' | 'skills' | 'credentials';

function tabFromHash(): TabId {
  const hash = window.location.hash.slice(1).toLowerCase();
  if (hash === 'skills' || hash === 'credentials') return hash;
  return 'mcp';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(tabFromHash);

  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }, []);
  const [editServerId, setEditServerId] = useState<string | null>(null);
  const [customSyncOpen, setCustomSyncOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    getTheme()
      .then(({ theme }) => {
        document.documentElement.dataset.theme = theme;
      })
      .catch(() => {
        document.documentElement.dataset.theme = 'dark';
      });
  }, []);

  const showToast = useCallback((message: string, type = 'success') => {
    setToast({ message, type });
  }, []);

  useOAuthCallback(showToast);

  const mcp = useMcpServers(showToast);

  const handleSave = useCallback(
    async (id: string | null, payload: Record<string, unknown>) => {
      try {
        await mcp.handleSave(id, payload);
      } catch (err) {
        showToast((err as Error).message, 'error');
        throw err;
      }
    },
    [mcp, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await mcp.handleDelete(id);
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [mcp, showToast]
  );

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await mcp.handleToggle(id, enabled);
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [mcp, showToast]
  );

  const handleReorder = useCallback(
    async (order: string[]) => {
      try {
        await mcp.handleReorder(order);
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [mcp, showToast]
  );

  const handleSync = useCallback(
    async (target: string) => {
      try {
        await mcp.handleSync(target);
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [mcp, showToast]
  );

  const handleCustomSync = useCallback(
    async (path: string, configKey: string) => {
      try {
        await mcp.handleCustomSync(path, configKey);
        setCustomSyncOpen(false);
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [mcp, showToast]
  );

  const handleEdit = (id: string | undefined) => setEditServerId(id ?? '');
  const handleCloseEdit = () => setEditServerId(null);
  const handleAddServer = () => setEditServerId('new');

  return (
    <div className="app">
      <header className="header">
        <h1>AI Tools Manager</h1>
        <div className="header-icon-actions">
          <button
            type="button"
            className="btn-icon header-settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            aria-label="Open settings"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>
          <a
            href="https://github.com/Salil999/ai-tool-center"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            title="View on GitHub"
            aria-label="View source on GitHub"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      <main className="main">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => handleTabChange('mcp')}
          >
            MCP Servers
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => handleTabChange('skills')}
          >
            Skills
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => handleTabChange('credentials')}
          >
            API Credentials
          </button>
        </div>

        {activeTab === 'mcp' && (
          <section className="servers-section">
            <div className="servers-section-header">
              <h2>MCP Servers</h2>
              <div className="header-actions">
                <SyncSection onSync={handleSync} onCustomSync={() => setCustomSyncOpen(true)} />
                <button type="button" className="btn" onClick={() => setImportOpen(true)}>
                  Import
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddServer}>
                  Add Server
                </button>
              </div>
            </div>
            <ServerList
              servers={mcp.servers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onReorder={handleReorder}
            />
          </section>
        )}

        {activeTab === 'skills' && (
          <section className="servers-section">
            <SkillsTab showToast={showToast} />
          </section>
        )}

        {activeTab === 'credentials' && (
          <section className="servers-section">
            <CredentialsTab showToast={showToast} />
          </section>
        )}
      </main>

      <footer className="footer">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setAuditOpen(true)}
        >
          Audit Log
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setInfoOpen(true)}
        >
          Information
        </button>
      </footer>

      {editServerId !== null && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div onClick={(e) => e.stopPropagation()}>
            <EditModal
              serverId={editServerId === 'new' ? null : editServerId}
              onClose={handleCloseEdit}
              onSave={handleSave}
            />
          </div>
        </div>
      )}

      {customSyncOpen && (
        <div className="modal-overlay" onClick={() => setCustomSyncOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CustomSyncModal
              onClose={() => setCustomSyncOpen(false)}
              onSync={handleCustomSync}
            />
          </div>
        </div>
      )}

      {auditOpen && (
        <div className="modal-overlay" onClick={() => setAuditOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuditModal onClose={() => setAuditOpen(false)} />
          </div>
        </div>
      )}

      {infoOpen && (
        <div className="modal-overlay" onClick={() => setInfoOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoModal onClose={() => setInfoOpen(false)} activeTab={activeTab as 'mcp' | 'skills' | 'credentials'} />
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-overlay" onClick={() => setImportOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ImportModal
              onClose={() => setImportOpen(false)}
              onImport={(result) => {
                const msg =
                  result.imported === 0
                    ? `No new servers (all already exist). Total: ${result.total}`
                    : `Imported ${result.imported} server(s). Total: ${result.total}`;
                showToast(msg);
                mcp.loadServers();
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsModal
              onClose={() => setSettingsOpen(false)}
              onReset={() => {
                window.location.reload();
              }}
              onImport={() => {
                mcp.loadServers();
              }}
              onError={(msg) => showToast(msg, 'error')}
              onSuccess={(msg) => showToast(msg)}
            />
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
