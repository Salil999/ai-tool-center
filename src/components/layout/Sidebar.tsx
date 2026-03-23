import { useState, useEffect } from 'react';
import { getImportSources } from '@/api-client';
import {
  House,
  Server,
  Zap,
  FileText,
  Workflow,
  Bot,
  Plug,
  Key,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '@/App';

// ── Provider logo icon wrappers ───────────────────────────────────

const CursorLogo: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <img
    src="https://cursor.com/apple-touch-icon.png"
    width={size}
    height={size}
    className="rounded-sm shrink-0"
    alt=""
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
  />
);

const ClaudeLogo: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <img
    src="https://cdn.simpleicons.org/claude"
    width={size}
    height={size}
    className="rounded-sm shrink-0"
    alt=""
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
  />
);

const VSCodeLogo: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <img
    src="https://code.visualstudio.com/assets/apple-touch-icon.png"
    width={size}
    height={size}
    className="rounded-sm shrink-0"
    alt=""
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
  />
);

const OpenCodeLogo: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <img
    src="https://opencode.ai/apple-touch-icon.png"
    width={size}
    height={size}
    className="rounded-sm shrink-0"
    alt=""
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
  />
);

// ── Nav item definitions ──────────────────────────────────────────

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const PROVIDER_NAV_ITEMS: NavItem[] = [
  { id: 'provider-cursor', label: 'Cursor', icon: CursorLogo },
  { id: 'provider-claude', label: 'Claude', icon: ClaudeLogo },
  { id: 'provider-vscode', label: 'VS Code', icon: VSCodeLogo },
  { id: 'provider-opencode', label: 'OpenCode', icon: OpenCodeLogo },
];

const TOOL_ITEMS: NavItem[] = [
  { id: 'mcp', label: 'MCP Servers', icon: Server },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'rules', label: 'Rules', icon: FileText },
  { id: 'hooks', label: 'Hooks', icon: Workflow },
  { id: 'subagents', label: 'Subagents', icon: Bot },
  { id: 'plugins', label: 'Plugins', icon: Plug },
  { id: 'credentials', label: 'API Credentials', icon: Key },
];

// ── Component ─────────────────────────────────────────────────────

interface SidebarProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeTab, onNavigate, collapsed, onToggle }: SidebarProps) {
  const [aiAssistantsOpen, setAiAssistantsOpen] = useState(true);
  const [aiToolsOpen, setAiToolsOpen] = useState(true);
  const [assistantItems, setAssistantItems] = useState<NavItem[]>(PROVIDER_NAV_ITEMS);

  useEffect(() => {
    getImportSources()
      .then((sources) => {
        const installedIds = new Set(
          sources.filter((s: { exists: boolean }) => s.exists).map((s: { id: string }) => s.id)
        );
        setAssistantItems(PROVIDER_NAV_ITEMS.filter((item) => installedIds.has(item.id.replace('provider-', ''))));
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r transition-all duration-200 ease-in-out select-none shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex h-14 items-center justify-between px-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {!collapsed && (
          <span className="text-sm font-semibold truncate mr-2" style={{ color: 'var(--text)' }}>
            AI Tools Manager
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
            collapsed && 'mx-auto'
          )}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {/* Home — ungrouped */}
        <SidebarItem
          item={{ id: 'home', label: 'Home', icon: House }}
          active={activeTab === 'home'}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />

        {/* Divider */}
        <div className="mx-3 my-1.5" style={{ borderTop: '1px solid var(--border)' }} />

        {/* AI Assistants group */}
        {!collapsed && (
          <GroupHeader
            label="AI Assistants"
            open={aiAssistantsOpen}
            onToggle={() => setAiAssistantsOpen((v) => !v)}
          />
        )}
        {(collapsed || aiAssistantsOpen) &&
          assistantItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}

        {/* Divider */}
        <div className="mx-3 my-1.5" style={{ borderTop: '1px solid var(--border)' }} />

        {/* AI Tools group */}
        {!collapsed && (
          <GroupHeader
            label="AI Tools"
            open={aiToolsOpen}
            onToggle={() => setAiToolsOpen((v) => !v)}
          />
        )}
        {(collapsed || aiToolsOpen) &&
          TOOL_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
      </nav>

      {/* Bottom: Settings */}
      <div className="py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <SidebarItem
          item={{ id: 'settings', label: 'Settings', icon: Settings }}
          active={activeTab === 'settings'}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}

// ── Group header ──────────────────────────────────────────────────

function GroupHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
    >
      <span>{label}</span>
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  );
}

// ── Sidebar item ──────────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: (tab: TabId) => void;
}

function SidebarItem({ item, active, collapsed, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={() => onNavigate(item.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors duration-100 focus-visible:outline-none',
        collapsed ? 'mx-2 w-10 justify-center' : 'mx-1 w-[calc(100%-8px)]'
      )}
      style={
        active
          ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }
          : { color: 'var(--text-muted)' }
      }
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
        }
      }}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}
