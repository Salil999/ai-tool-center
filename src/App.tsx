import { useState, useCallback } from 'react';
import { ServerList } from './components/mcp/ServerList';
import { EditModal } from './components/mcp/EditModal';
import { SyncSection } from './components/mcp/SyncSection';
import { CustomSyncModal } from './components/mcp/CustomSyncModal';
import { ImportModal } from './components/mcp/ImportModal';
import { InfoModal } from './components/shared/InfoModal';
import { AuditModal } from './components/shared/AuditModal';
import { Toast } from './components/shared/Toast';
import { SkillsTab } from './components/skills/SkillsTab';
import { CredentialsTab } from './components/credentials/CredentialsTab';
import { useMcpServers } from './hooks/useMcpServers';
import { useOAuthCallback } from './hooks/useOAuthCallback';

export default function App() {
  const [activeTab, setActiveTab] = useState<'mcp' | 'skills' | 'credentials'>('mcp');
  const [editServerId, setEditServerId] = useState<string | null>(null);
  const [customSyncOpen, setCustomSyncOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

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
      </header>

      <main className="main">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            MCP Servers
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
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
