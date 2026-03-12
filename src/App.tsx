import { useState, useEffect, useCallback } from 'react';
import { ServerList } from './components/ServerList';
import { EditModal } from './components/EditModal';
import { SyncSection } from './components/SyncSection';
import { CustomSyncModal } from './components/CustomSyncModal';
import { ImportModal } from './components/ImportModal';
import { InfoModal } from './components/InfoModal';
import { AuditModal } from './components/AuditModal';
import { Toast } from './components/Toast';
import { SkillsTab } from './components/SkillsTab';
import { CredentialsTab } from './components/CredentialsTab';
import { getServers, createServer, updateServer, deleteServer, setServerEnabled, reorderServers, syncTo, syncToCustom } from './api';
import type { Server } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'mcp' | 'skills' | 'credentials'>('mcp');
  const [servers, setServers] = useState<Server[]>([]);
  const [editServerId, setEditServerId] = useState<string | null>(null);
  const [customSyncOpen, setCustomSyncOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = useCallback((message: string, type = 'success') => {
    setToast({ message, type });
  }, []);

  const loadServers = useCallback(async () => {
    const list = await getServers();
    setServers(list as Server[]);
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') {
      const serverId = params.get('serverId');
      showToast(serverId ? `Authorization complete for ${serverId}` : 'Authorization complete');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauth === 'error') {
      const message = params.get('message') || 'Authorization failed';
      showToast(decodeURIComponent(message), 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  const handleEdit = (id: string | undefined) => setEditServerId(id ?? '');
  const handleCloseEdit = () => setEditServerId(null);

  const handleSave = async (id: string | null, payload: Record<string, unknown>) => {
    try {
      if (id) {
        await updateServer(id, payload);
        showToast('Server updated');
      } else {
        await createServer(payload);
        showToast('Server added');
      }
      await loadServers();
    } catch (err) {
      showToast((err as Error).message, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteServer(id);
      showToast('Server deleted');
      await loadServers();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await setServerEnabled(id, enabled);
      showToast(enabled ? 'Server enabled' : 'Server disabled');
      await loadServers();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReorder = async (order: string[]) => {
    try {
      await reorderServers(order);
      showToast('Order updated');
      await loadServers();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSync = async (target: string) => {
    try {
      const result = await syncTo(target);
      showToast(`Synced to ${target} at ${result.path}`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleCustomSync = async (path: string, configKey: string) => {
    try {
      const result = await syncToCustom(path, configKey);
      showToast(`Synced to ${result.path}`);
      setCustomSyncOpen(false);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

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
              servers={servers}
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
                loadServers();
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
