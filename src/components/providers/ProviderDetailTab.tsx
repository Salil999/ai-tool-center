import { useEffect, useState, useCallback } from 'react';
import { getProviders, getClaudeStatus, getCursorStatus, getOpenCodeStatus } from '@/api-client/providers';
import type {
  BuiltinProvider, ClaudeStatus, ClaudeProjectStatus,
  CursorStatus, CursorProjectStatus,
  OpenCodeStatus, OpenCodeProjectStatus,
} from '@/api-client/providers';
import { getImportSources, importFromSource } from '@/api-client/import';
import { getServers } from '@/api-client/servers';
import { getSkills, importSkillsFromSource } from '@/api-client/skills';
import { getProviderRules } from '@/api-client/rules';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Server } from 'lucide-react';
import type { TabId } from '@/App';

const PROVIDER_LOGOS: Record<string, string> = {
  cursor: 'https://cursor.com/apple-touch-icon.png',
  claude: 'https://cdn.simpleicons.org/claude',
  vscode: 'https://code.visualstudio.com/assets/apple-touch-icon.png',
  opencode: 'https://opencode.ai/apple-touch-icon.png',
};

interface ServerItem { id: string; name: string; type: string }
interface SkillItem { id: string; name: string; path: string }
interface RuleItem { id: string; name: string; extension: string }

interface ProviderData {
  provider: BuiltinProvider | null;
  importSource: { path: string; exists: boolean } | null;
  servers: ServerItem[];
  skills: SkillItem[];
  rules: RuleItem[];
}

interface ProviderDetailTabProps {
  providerId: string;
  onNavigate: (tab: TabId) => void;
}

// ── Collapsible section wrapper ───────────────────────────────────────────────

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg" style={{ border: '1px solid var(--border)' }}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{
          background: 'var(--bg-card)',
          borderRadius: open ? '0.5rem 0.5rem 0 0' : '0.5rem',
        }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</span>
          {subtitle && (
            <p className="text-xs font-mono mt-0.5 truncate" style={{ color: 'var(--text-muted)', maxWidth: '30rem' }}>{subtitle}</p>
          )}
        </div>
        {open
          ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: '0 0 0.5rem 0.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Claude-specific detail view ───────────────────────────────────────────────

function ClaudeDetailTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getClaudeStatus());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  }

  const user = status?.user;
  const isInstalled = !!(user?.mcpServers.length || user?.skills.length || user?.claudeMd.exists);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            <img
              src={PROVIDER_LOGOS['claude']}
              alt="Claude Code"
              width={36}
              height={36}
              className="rounded-lg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Claude Code</h1>
              <Badge variant={isInstalled ? 'active' : 'inactive'}>
                {isInstalled ? 'Installed' : 'Not Installed'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              ~/.claude.json · ~/.claude/
            </p>
          </div>
        </div>
      </div>

      {/* User-level collapsible */}
      <div className="mb-4">
        <CollapsibleSection title="User Level" subtitle="~/.claude/" defaultOpen={false}>
          <div className="space-y-4 px-4 py-4">
            <ToolSection title="MCP Servers" count={user?.mcpServers.length ?? 0} onManage={() => onNavigate('mcp')}>
              {!user?.mcpServers.length ? (
                <EmptyState text="No MCP servers configured" />
              ) : (
                <>
                  {user.mcpServers.slice(0, 10).map((s) => (
                    <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
                      <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
                    </div>
                  ))}
                  {user.mcpServers.length > 10 && (
                    <button type="button" onClick={() => onNavigate('mcp')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                      Show all {user.mcpServers.length} servers
                    </button>
                  )}
                </>
              )}
            </ToolSection>

            <ToolSection title="Skills" count={user?.skills.length ?? 0} onManage={() => onNavigate('skills')}>
              {!user?.skills.length ? (
                <EmptyState text="No skills installed" />
              ) : (
                user.skills.map((s) => (
                  <div key={s.name} className="py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{s.name}</span>
                  </div>
                ))
              )}
            </ToolSection>

            <ToolSection title="Hooks" count={user?.hooks.length ?? 0} onManage={() => onNavigate('hooks')}>
              {!user?.hooks.length ? (
                <EmptyState text="No hooks configured" />
              ) : (
                user.hooks.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 min-w-0">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{h.event}</span>
                    <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{h.command ?? h.type}</span>
                  </div>
                ))
              )}
            </ToolSection>

            <ToolSection title="CLAUDE.md" count={user?.claudeMd.exists ? 1 : 0} onManage={() => onNavigate('rules')}>
              {!user?.claudeMd.exists ? (
                <EmptyState text="No CLAUDE.md found at ~/.claude/CLAUDE.md" />
              ) : (
                <div className="py-1.5">
                  <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{user.claudeMd.path}</p>
                  {user.claudeMd.preview && (
                    <pre
                      className="text-xs whitespace-pre-wrap break-words overflow-auto rounded p-2"
                      style={{
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        maxHeight: '24rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {user.claudeMd.preview}
                    </pre>
                  )}
                </div>
              )}
            </ToolSection>
          </div>
        </CollapsibleSection>
      </div>

      {/* Project-level collapsible sections */}
      {(status?.projects.length ?? 0) > 0 && (
        <div className="space-y-4">
          {status!.projects.map((proj) => (
            <CollapsibleSection
              key={proj.id}
              title={proj.name}
              subtitle={proj.path}
              defaultOpen={false}
            >
              <ProjectSectionContent project={proj} onNavigate={onNavigate} />
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSectionContent({ project, onNavigate }: { project: ClaudeProjectStatus; onNavigate: (tab: TabId) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <ToolSection title="MCP Servers (project scope)" count={project.mcpServers.length} onManage={() => onNavigate('mcp')}>
        {!project.mcpServers.length ? (
          <EmptyState text="No .mcp.json found" />
        ) : (
          project.mcpServers.map((s) => (
            <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
              <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
            </div>
          ))
        )}
      </ToolSection>

      <ToolSection title="MCP Servers (local scope)" count={project.localMcpServers?.length ?? 0} onManage={() => onNavigate('mcp')}>
        {!(project.localMcpServers?.length) ? (
          <EmptyState text="No local-scope servers in ~/.claude.json" />
        ) : (
          project.localMcpServers.map((s) => (
            <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
              <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
            </div>
          ))
        )}
      </ToolSection>

      <ToolSection title="Skills" count={project.skills.length} onManage={() => onNavigate('skills')}>
        {!project.skills.length ? (
          <EmptyState text="No .claude/skills/ found" />
        ) : (
          project.skills.map((s) => (
            <div key={s.name} className="py-1.5">
              <span className="text-sm" style={{ color: 'var(--text)' }}>{s.name}</span>
            </div>
          ))
        )}
      </ToolSection>

      <ToolSection title="Hooks" count={project.hooks.length} onManage={() => onNavigate('hooks')}>
        {!project.hooks.length ? (
          <EmptyState text="No hooks in .claude/settings.json" />
        ) : (
          project.hooks.map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 min-w-0">
              <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{h.event}</span>
              <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{h.command ?? h.type}</span>
            </div>
          ))
        )}
      </ToolSection>

      <ToolSection title="CLAUDE.md" count={project.claudeMd.exists ? 1 : 0} onManage={() => onNavigate('rules')}>
        {!project.claudeMd.exists ? (
          <EmptyState text="No CLAUDE.md found in project root" />
        ) : (
          <div className="py-1.5">
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{project.claudeMd.path}</p>
            {project.claudeMd.preview && (
              <pre
                className="text-xs whitespace-pre-wrap break-words overflow-auto rounded p-2"
                style={{
                  color: 'var(--text)',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  maxHeight: '24rem',
                  fontFamily: 'monospace',
                }}
              >
                {project.claudeMd.preview}
              </pre>
            )}
          </div>
        )}
      </ToolSection>
    </div>
  );
}

// ── Cursor detail view ────────────────────────────────────────────────────────

function CursorDetailTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [status, setStatus] = useState<CursorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getCursorStatus()); } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;

  const user = status?.user;
  const isInstalled = !!(user?.mcpServers.length || user?.rules.length || user?.skills.length);

  return (
    <div>
      <div className="mb-6 flex items-start">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            <img src={PROVIDER_LOGOS['cursor']} alt="Cursor" width={36} height={36} className="rounded-lg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Cursor</h1>
              <Badge variant={isInstalled ? 'active' : 'inactive'}>{isInstalled ? 'Installed' : 'Not Installed'}</Badge>
            </div>
            <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>~/.cursor/mcp.json · ~/.cursor/</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <CollapsibleSection title="User Level" subtitle="~/.cursor/" defaultOpen={false}>
          <div className="space-y-4 px-4 py-4">
            <ToolSection title="MCP Servers" count={user?.mcpServers.length ?? 0} onManage={() => onNavigate('mcp')}>
              {!user?.mcpServers.length ? <EmptyState text="No MCP servers in ~/.cursor/mcp.json" /> : (
                user.mcpServers.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
                    <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
                  </div>
                ))
              )}
            </ToolSection>
            <ToolSection title="Rules" count={user?.rules.length ?? 0} onManage={() => onNavigate('rules')}>
              {!user?.rules.length ? <EmptyState text="No rules in ~/.cursor/rules/" /> : (
                user.rules.map((r) => (
                  <div key={r.name} className="py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{r.name}</span>
                  </div>
                ))
              )}
            </ToolSection>
            <ToolSection title="Skills" count={user?.skills.length ?? 0} onManage={() => onNavigate('skills')}>
              {!user?.skills.length ? <EmptyState text="No skills in ~/.cursor/skills/" /> : (
                user.skills.map((s) => (
                  <div key={s.name} className="py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{s.name}</span>
                  </div>
                ))
              )}
            </ToolSection>
            <ToolSection title="Subagents" count={user?.agents.length ?? 0} onManage={() => onNavigate('subagents')}>
              {!user?.agents.length ? <EmptyState text="No agents in ~/.cursor/agents/" /> : (
                user.agents.map((a) => (
                  <div key={a.name} className="py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{a.name}</span>
                  </div>
                ))
              )}
            </ToolSection>
          </div>
        </CollapsibleSection>
      </div>

      {(status?.projects.length ?? 0) > 0 && (
        <div className="space-y-4">
          {status!.projects.map((proj) => (
            <CollapsibleSection key={proj.id} title={proj.name} subtitle={proj.path} defaultOpen={false}>
              <div className="space-y-4 px-4 py-4">
                <ToolSection title="MCP Servers" count={proj.mcpServers.length} onManage={() => onNavigate('mcp')}>
                  {!proj.mcpServers.length ? <EmptyState text="No .cursor/mcp.json found" /> : (
                    proj.mcpServers.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
                        <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
                <ToolSection title="Rules" count={proj.rules.length} onManage={() => onNavigate('rules')}>
                  {!proj.rules.length ? <EmptyState text="No .cursor/rules/ found" /> : (
                    proj.rules.map((r) => (
                      <div key={r.name} className="py-1.5">
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{r.name}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
                <ToolSection title="Skills" count={proj.skills.length} onManage={() => onNavigate('skills')}>
                  {!proj.skills.length ? <EmptyState text="No .cursor/skills/ found" /> : (
                    proj.skills.map((s) => (
                      <div key={s.name} className="py-1.5">
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{s.name}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
                <ToolSection title="Subagents" count={proj.agents.length} onManage={() => onNavigate('subagents')}>
                  {!proj.agents.length ? <EmptyState text="No .cursor/agents/ found" /> : (
                    proj.agents.map((a) => (
                      <div key={a.name} className="py-1.5">
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{a.name}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}

// ── OpenCode detail view ──────────────────────────────────────────────────────

function OpenCodeDetailTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [status, setStatus] = useState<OpenCodeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getOpenCodeStatus()); } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;

  const user = status?.user;
  const isInstalled = !!(user?.mcpServers.length || user?.commands.length || user?.agentsMd.exists);

  return (
    <div>
      <div className="mb-6 flex items-start">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            <img src={PROVIDER_LOGOS['opencode']} alt="OpenCode" width={36} height={36} className="rounded-lg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>OpenCode</h1>
              <Badge variant={isInstalled ? 'active' : 'inactive'}>{isInstalled ? 'Installed' : 'Not Installed'}</Badge>
            </div>
            <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>~/.config/opencode/opencode.json · ~/.config/opencode/</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <CollapsibleSection title="User Level" subtitle="~/.config/opencode/" defaultOpen={false}>
          <div className="space-y-4 px-4 py-4">
            <ToolSection title="MCP Servers" count={user?.mcpServers.length ?? 0} onManage={() => onNavigate('mcp')}>
              {!user?.mcpServers.length ? <EmptyState text="No MCP servers in opencode.json" /> : (
                user.mcpServers.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
                    <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
                  </div>
                ))
              )}
            </ToolSection>
            <ToolSection title="Commands" count={user?.commands.length ?? 0} onManage={() => onNavigate('rules')}>
              {!user?.commands.length ? <EmptyState text="No commands in ~/.config/opencode/commands/" /> : (
                user.commands.map((c) => (
                  <div key={c.name} className="py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>/{c.name}</span>
                  </div>
                ))
              )}
            </ToolSection>
            <ToolSection title="Subagents" count={user?.agents.length ?? 0} onManage={() => onNavigate('subagents')}>
              {!user?.agents.length ? <EmptyState text="No agents in ~/.config/opencode/agents/" /> : (
                user.agents.map((a) => (
                  <div key={a.name} className="py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{a.name}</span>
                  </div>
                ))
              )}
            </ToolSection>
            <ToolSection title="AGENTS.md" count={user?.agentsMd.exists ? 1 : 0} onManage={() => onNavigate('rules')}>
              {!user?.agentsMd.exists ? <EmptyState text="No AGENTS.md found" /> : (
                <div className="py-1.5">
                  <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{user.agentsMd.path}</p>
                  {user.agentsMd.preview && (
                    <pre className="text-xs whitespace-pre-wrap break-words overflow-auto rounded p-2"
                      style={{ color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', maxHeight: '12rem', fontFamily: 'monospace' }}>
                      {user.agentsMd.preview}
                    </pre>
                  )}
                </div>
              )}
            </ToolSection>
          </div>
        </CollapsibleSection>
      </div>

      {(status?.projects.length ?? 0) > 0 && (
        <div className="space-y-4">
          {status!.projects.map((proj) => (
            <CollapsibleSection key={proj.id} title={proj.name} subtitle={proj.path} defaultOpen={false}>
              <div className="space-y-4 px-4 py-4">
                <ToolSection title="MCP Servers" count={proj.mcpServers.length} onManage={() => onNavigate('mcp')}>
                  {!proj.mcpServers.length ? <EmptyState text="No opencode.json mcp config found" /> : (
                    proj.mcpServers.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 py-1.5 min-w-0">
                        <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
                <ToolSection title="Commands" count={proj.commands.length} onManage={() => onNavigate('rules')}>
                  {!proj.commands.length ? <EmptyState text="No .opencode/commands/ found" /> : (
                    proj.commands.map((c) => (
                      <div key={c.name} className="py-1.5">
                        <span className="text-sm" style={{ color: 'var(--text)' }}>/{c.name}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
                <ToolSection title="Subagents" count={proj.agents.length} onManage={() => onNavigate('subagents')}>
                  {!proj.agents.length ? <EmptyState text="No .opencode/agents/ found" /> : (
                    proj.agents.map((a) => (
                      <div key={a.name} className="py-1.5">
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{a.name}</span>
                      </div>
                    ))
                  )}
                </ToolSection>
                <ToolSection title="AGENTS.md" count={proj.agentsMd.exists ? 1 : 0} onManage={() => onNavigate('rules')}>
                  {!proj.agentsMd.exists ? <EmptyState text="No AGENTS.md found in project root" /> : (
                    <div className="py-1.5">
                      <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{proj.agentsMd.path}</p>
                      {proj.agentsMd.preview && (
                        <pre className="text-xs whitespace-pre-wrap break-words overflow-auto rounded p-2"
                          style={{ color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', maxHeight: '12rem', fontFamily: 'monospace' }}>
                          {proj.agentsMd.preview}
                        </pre>
                      )}
                    </div>
                  )}
                </ToolSection>
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Top-level router ──────────────────────────────────────────────────────────

export function ProviderDetailTab({ providerId, onNavigate }: ProviderDetailTabProps) {
  if (providerId === 'claude') return <ClaudeDetailTab onNavigate={onNavigate} />;
  if (providerId === 'cursor') return <CursorDetailTab onNavigate={onNavigate} />;
  if (providerId === 'opencode') return <OpenCodeDetailTab onNavigate={onNavigate} />;
  return <GenericProviderDetailTab providerId={providerId} onNavigate={onNavigate} />;
}

function GenericProviderDetailTab({ providerId, onNavigate }: ProviderDetailTabProps) {
  const [data, setData] = useState<ProviderData>({
    provider: null,
    importSource: null,
    servers: [],
    skills: [],
    rules: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ builtin }, sources] = await Promise.all([getProviders(), getImportSources()]);
      const provider = builtin.find((p: BuiltinProvider) => p.id === providerId) ?? null;
      const importSource = sources.find((s: { id: string }) => s.id === providerId) ?? null;

      const fetches: Promise<unknown>[] = [];
      fetches.push(provider?.capabilities.mcp ? importFromSource(providerId).catch(() => {}).then(() => getServers()) : Promise.resolve([]));
      fetches.push(provider?.capabilities.skills ? importSkillsFromSource(providerId).catch(() => {}).then(() => getSkills()) : Promise.resolve([]));
      fetches.push(provider?.capabilities.rules ? getProviderRules(providerId).catch(() => []) : Promise.resolve([]));

      const [rawServers, rawSkills, rawRules] = await Promise.all(fetches);
      setData({
        provider,
        importSource,
        servers: (rawServers as Record<string, unknown>[]).map((s) => ({ id: String(s.id ?? s.name ?? ''), name: String(s.name ?? ''), type: String(s.type ?? 'stdio') })),
        skills: (rawSkills as Record<string, unknown>[]).map((s) => ({ id: String(s.id ?? s.name ?? ''), name: String(s.name ?? ''), path: String(s.path ?? '') })),
        rules: (rawRules as Record<string, unknown>[]).map((r) => ({ id: String(r.id ?? r.name ?? ''), name: String(r.name ?? ''), extension: String(r.extension ?? '.md') })),
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  const logoUrl = PROVIDER_LOGOS[providerId];
  const providerName = data.provider?.name ?? providerId;
  const isInstalled = data.importSource?.exists ?? false;

  if (loading) {
    return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-start">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={providerName} width={36} height={36} className="rounded-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <Server size={36} />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{providerName}</h1>
              <Badge variant={isInstalled ? 'active' : 'inactive'}>{isInstalled ? 'Installed' : 'Not Installed'}</Badge>
            </div>
            {data.importSource?.path && (
              <p className="mt-0.5 text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>{data.importSource.path}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.provider?.capabilities.mcp && (
          <ToolSection title="MCP Servers" count={data.servers.length} onManage={() => onNavigate('mcp')}>
            {data.servers.length === 0 ? <EmptyState text="No MCP servers configured" /> : (
              <>
                {data.servers.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-1.5 min-w-0">
                    <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.type}</span>
                  </div>
                ))}
                {data.servers.length > 10 && (
                  <button type="button" onClick={() => onNavigate('mcp')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">Show all {data.servers.length} servers</button>
                )}
              </>
            )}
          </ToolSection>
        )}
        {data.provider?.capabilities.skills && (
          <ToolSection title="Skills" count={data.skills.length} onManage={() => onNavigate('skills')}>
            {data.skills.length === 0 ? <EmptyState text="No skills configured" /> : (
              <>
                {data.skills.slice(0, 10).map((s) => (
                  <div key={s.id} className="py-1.5"><span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span></div>
                ))}
                {data.skills.length > 10 && (
                  <button type="button" onClick={() => onNavigate('skills')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">Show all {data.skills.length} skills</button>
                )}
              </>
            )}
          </ToolSection>
        )}
        {data.provider?.capabilities.rules && (
          <ToolSection title="Rules" count={data.rules.length} onManage={() => onNavigate('rules')}>
            {data.rules.length === 0 ? <EmptyState text="No rules configured" /> : (
              <>
                {data.rules.slice(0, 10).map((r) => (
                  <div key={r.id} className="py-1.5"><span className="text-sm" style={{ color: 'var(--text)' }}>{r.name}{r.extension}</span></div>
                ))}
                {data.rules.length > 10 && (
                  <button type="button" onClick={() => onNavigate('rules')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">Show all {data.rules.length} rules</button>
                )}
              </>
            )}
          </ToolSection>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ToolSection({ title, count, onManage, children }: { title: string; count: number; onManage: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{count}</span>
        </div>
        <button type="button" onClick={onManage} className="flex items-center gap-1 text-xs transition-colors text-indigo-400 hover:text-indigo-300">
          Manage <ChevronRight size={12} />
        </button>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{text}</p>;
}
