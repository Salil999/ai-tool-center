import { useEffect, useState, useCallback } from 'react';
import { getProviders } from '@/api-client/providers';
import type { BuiltinProvider } from '@/api-client/providers';
import { getImportSources, importFromSource } from '@/api-client/import';
import { getServers } from '@/api-client/servers';
import { getSkills, importSkillsFromSource } from '@/api-client/skills';
import { getProviderRules } from '@/api-client/rules';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Server } from 'lucide-react';
import type { TabId } from '@/App';

const PROVIDER_LOGOS: Record<string, string> = {
  cursor: 'https://cursor.com/apple-touch-icon.png',
  claude: 'https://cdn.simpleicons.org/claude',
  vscode: 'https://code.visualstudio.com/assets/apple-touch-icon.png',
  opencode: 'https://opencode.ai/apple-touch-icon.png',
};

interface ServerItem {
  id: string;
  name: string;
  type: string;
}

interface SkillItem {
  id: string;
  name: string;
  path: string;
}

interface RuleItem {
  id: string;
  name: string;
  extension: string;
}

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

export function ProviderDetailTab({ providerId, onNavigate }: ProviderDetailTabProps) {
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
      // 1. Get provider metadata and import source info in parallel
      const [{ builtin }, sources] = await Promise.all([
        getProviders(),
        getImportSources(),
      ]);

      const provider = builtin.find((p: BuiltinProvider) => p.id === providerId) ?? null;
      const importSource = sources.find((s: { id: string }) => s.id === providerId) ?? null;

      // 2. Fire background imports, then fetch central store data
      const fetches: Promise<unknown>[] = [];

      if (provider?.capabilities.mcp) {
        // Background import then fetch servers
        fetches.push(
          importFromSource(providerId).catch(() => {}).then(() => getServers())
        );
      } else {
        fetches.push(Promise.resolve([]));
      }

      if (provider?.capabilities.skills) {
        fetches.push(
          importSkillsFromSource(providerId).catch(() => {}).then(() => getSkills())
        );
      } else {
        fetches.push(Promise.resolve([]));
      }

      if (provider?.capabilities.rules) {
        fetches.push(getProviderRules(providerId).catch(() => []));
      } else {
        fetches.push(Promise.resolve([]));
      }

      const [rawServers, rawSkills, rawRules] = await Promise.all(fetches);

      const servers = (rawServers as Record<string, unknown>[]).map((s) => ({
        id: String(s.id ?? s.name ?? ''),
        name: String(s.name ?? ''),
        type: String(s.type ?? 'stdio'),
      }));

      const skills = (rawSkills as Record<string, unknown>[]).map((s) => ({
        id: String(s.id ?? s.name ?? ''),
        name: String(s.name ?? ''),
        path: String(s.path ?? ''),
      }));

      const rules = (rawRules as Record<string, unknown>[]).map((r) => ({
        id: String(r.id ?? r.name ?? ''),
        name: String(r.name ?? ''),
        extension: String(r.extension ?? '.md'),
      }));

      setData({ provider, importSource, servers, skills, rules });
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
      {/* Header */}
      <div className="mb-6 flex items-start">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={providerName}
                width={36}
                height={36}
                className="rounded-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <Server size={36} />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{providerName}</h1>
              <Badge variant={isInstalled ? 'active' : 'inactive'}>
                {isInstalled ? 'Installed' : 'Not Installed'}
              </Badge>
            </div>
            {data.importSource?.path && (
              <p className="mt-0.5 text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
                {data.importSource.path}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {data.provider?.capabilities.mcp && (
          <ToolSection
            title="MCP Servers"
            count={data.servers.length}
            onManage={() => onNavigate('mcp')}
          >
            {data.servers.length === 0 ? (
              <EmptyState text="No MCP servers configured" />
            ) : (
              data.servers.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 min-w-0">
                  <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {s.type}
                  </span>
                </div>
              ))
            )}
            {data.servers.length > 10 && (
              <button type="button" onClick={() => onNavigate('mcp')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                Show all {data.servers.length} servers
              </button>
            )}
          </ToolSection>
        )}

        {data.provider?.capabilities.skills && (
          <ToolSection
            title="Skills"
            count={data.skills.length}
            onManage={() => onNavigate('skills')}
          >
            {data.skills.length === 0 ? (
              <EmptyState text="No skills configured" />
            ) : (
              data.skills.slice(0, 10).map((s) => (
                <div key={s.id} className="py-1.5">
                  <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                </div>
              ))
            )}
            {data.skills.length > 10 && (
              <button type="button" onClick={() => onNavigate('skills')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                Show all {data.skills.length} skills
              </button>
            )}
          </ToolSection>
        )}

        {data.provider?.capabilities.rules && (
          <ToolSection
            title="Rules"
            count={data.rules.length}
            onManage={() => onNavigate('rules')}
          >
            {data.rules.length === 0 ? (
              <EmptyState text="No rules configured" />
            ) : (
              data.rules.slice(0, 10).map((r) => (
                <div key={r.id} className="py-1.5">
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    {r.name}{r.extension}
                  </span>
                </div>
              ))
            )}
            {data.rules.length > 10 && (
              <button type="button" onClick={() => onNavigate('rules')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                Show all {data.rules.length} rules
              </button>
            )}
          </ToolSection>
        )}
      </div>
    </div>
  );
}

function ToolSection({
  title,
  count,
  onManage,
  children,
}: {
  title: string;
  count: number;
  onManage: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {count}
          </span>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="flex items-center gap-1 text-xs transition-colors text-indigo-400 hover:text-indigo-300"
        >
          Manage <ChevronRight size={12} />
        </button>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{text}</p>
  );
}
