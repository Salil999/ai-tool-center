import { useState, useCallback, useEffect } from 'react';
import { ServerList } from '@/components/mcp/ServerList';
import { getTheme } from '@/api-client';
import { SkillsTab } from '@/components/skills/SkillsTab';
import { RulesTab } from '@/components/rules/RulesTab';
import { CredentialsTab } from '@/components/credentials/CredentialsTab';
import { HooksTab } from '@/components/hooks/HooksTab';
import { SubagentsTab } from '@/components/subagents/SubagentsTab';
import { PluginsTab } from '@/components/plugins/PluginsTab';
import { HomeTab } from '@/components/HomeTab';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { ProviderDetailTab } from '@/components/providers/ProviderDetailTab';
import { Sidebar } from '@/components/layout/Sidebar';
import { ModalContainer } from '@/components/shared/ModalContainer';
import { Modal } from '@/components/shared/Modal';
import { SyncWizardModal } from '@/components/sync/SyncWizardModal';
import { useMcpServers } from '@/hooks/useMcpServers';
import { useOAuthCallback } from '@/hooks/useOAuthCallback';
import { useToast } from '@/contexts/ToastContext';

// ── Tab registry ─────────────────────────────────────────────────

export type TabId =
  | 'home'
  | 'mcp'
  | 'skills'
  | 'rules'
  | 'credentials'
  | 'hooks'
  | 'subagents'
  | 'plugins'
  | 'settings'
  | 'provider-cursor'
  | 'provider-claude'
  | 'provider-vscode'
  | 'provider-opencode';

const PROVIDER_TAB_IDS = new Set<string>([
  'provider-cursor',
  'provider-claude',
  'provider-vscode',
  'provider-opencode',
]);

interface TabDef {
  id: TabId;
  label: string;
  infoLabel: string;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Home', infoLabel: 'Home — User Guide' },
  { id: 'mcp', label: 'MCP Servers', infoLabel: 'MCP Servers — User Guide' },
  { id: 'skills', label: 'Skills', infoLabel: 'Skills — User Guide' },
  { id: 'rules', label: 'Rules', infoLabel: 'Rules & AGENTS.md — User Guide' },
  { id: 'hooks', label: 'Hooks', infoLabel: 'Hooks — User Guide' },
  { id: 'subagents', label: 'Subagents', infoLabel: 'Subagents — User Guide' },
  { id: 'plugins', label: 'Plugins', infoLabel: 'Plugins — User Guide' },
  { id: 'credentials', label: 'API Credentials', infoLabel: 'API Credentials — User Guide' },
  { id: 'settings', label: 'Settings', infoLabel: 'Settings — User Guide' },
];

const VALID_TAB_IDS = new Set<string>(TABS.map((t) => t.id));

function tabFromHash(): TabId {
  const hash = window.location.hash.slice(1).toLowerCase();
  if (VALID_TAB_IDS.has(hash) || PROVIDER_TAB_IDS.has(hash)) return hash as TabId;
  if (hash === 'agents') return 'rules';
  return 'home';
}


export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(tabFromHash);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [importOpen, setImportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [syncWizardOpen, setSyncWizardOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getTheme()
      .then(({ theme }) => {
        document.documentElement.dataset.theme = theme;
      })
      .catch(() => {
        document.documentElement.dataset.theme = 'dark';
      });
  }, []);

  useOAuthCallback();

  const mcp = useMcpServers();

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

  const handleEdit = (id: string | undefined) => setEditServerId(id ?? '');
  const handleCloseEdit = () => setEditServerId(null);
  const handleAddServer = () => setEditServerId('new');

  // Resolve the info label for the active tab
  const activeTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  // Show "?" info button only for tabs that have guide content
  const showInfoButton = ['mcp', 'skills', 'rules', 'credentials', 'hooks', 'subagents', 'plugins'].includes(activeTab);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sync wizard modal */}
      {syncWizardOpen && (
        <Modal isOpen onClose={() => setSyncWizardOpen(false)} aria-labelledby="sync-wizard-modal-title">
          <SyncWizardModal
            onClose={() => setSyncWizardOpen(false)}
            onSyncComplete={() => mcp.loadServers()}
          />
        </Modal>
      )}

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleTabChange}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, padding: '1.5rem' }}>

          {/* Home */}
          {activeTab === 'home' && (
            <HomeTab onNavigate={handleTabChange} />
          )}

          {/* Provider detail views */}
          {PROVIDER_TAB_IDS.has(activeTab) && (
            <ProviderDetailTab
              providerId={activeTab.replace('provider-', '')}
              onNavigate={handleTabChange}
            />
          )}

          {/* MCP Servers */}
          {activeTab === 'mcp' && (
            <section className="servers-section">
              <div className="servers-section-header">
                <h2>MCP Servers</h2>
                <div className="header-actions">
                  <button type="button" className="btn" onClick={() => setSyncWizardOpen(true)}>
                    Sync
                  </button>
                  <button type="button" className="btn" onClick={() => setImportOpen(true)}>
                    Import
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleAddServer}>
                    Add Server
                  </button>
                  {showInfoButton && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setInfoOpen(true)}
                      title={activeTabDef.infoLabel}
                      aria-label="Open user guide"
                    >
                      ?
                    </button>
                  )}
                </div>
              </div>
              <ServerList
                servers={mcp.servers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReorder={handleReorder}
              />
            </section>
          )}

          {/* Other content tabs */}
          {activeTab === 'skills' && <section className="servers-section"><SkillsTab onHelp={() => setInfoOpen(true)} onSync={() => setSyncWizardOpen(true)} /></section>}
          {activeTab === 'rules' && <section className="servers-section"><RulesTab onHelp={() => setInfoOpen(true)} onSync={() => setSyncWizardOpen(true)} /></section>}
          {activeTab === 'hooks' && <section className="servers-section"><HooksTab onHelp={() => setInfoOpen(true)} onSync={() => setSyncWizardOpen(true)} /></section>}
          {activeTab === 'subagents' && <section className="servers-section"><SubagentsTab onHelp={() => setInfoOpen(true)} onSync={() => setSyncWizardOpen(true)} /></section>}
          {activeTab === 'plugins' && <section className="servers-section"><PluginsTab onHelp={() => setInfoOpen(true)} onSync={() => setSyncWizardOpen(true)} /></section>}
          {activeTab === 'credentials' && <section className="servers-section"><CredentialsTab onHelp={() => setInfoOpen(true)} onSync={() => setSyncWizardOpen(true)} /></section>}

          {/* Settings page */}
          {activeTab === 'settings' && (
            <SettingsPage
              onReset={() => window.location.reload()}
              onImport={() => mcp.loadServers()}
              onError={(msg) => showToast(msg, 'error')}
              onSuccess={(msg) => showToast(msg)}
            />
          )}
        </main>
      </div>

      <ModalContainer
        activeTab={activeTab}
        editServerId={editServerId}
        importOpen={importOpen}
        infoOpen={infoOpen}
        onCloseEdit={handleCloseEdit}
        onSave={handleSave}
        onCloseImport={() => setImportOpen(false)}
        onImport={(result) => {
          const msg =
            result.imported === 0
              ? `No new servers (all already exist). Total: ${result.total}`
              : `Imported ${result.imported} server(s). Total: ${result.total}`;
          showToast(msg);
        }}
        onImportError={(msg) => showToast(msg, 'error')}
        onCloseInfo={() => setInfoOpen(false)}
        loadServers={mcp.loadServers}
      />
    </div>
  );
}
