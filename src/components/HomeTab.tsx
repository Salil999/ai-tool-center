import { useEffect, useState } from 'react';
import { getImportSources } from '@/api-client/import';
import { getServers } from '@/api-client/servers';
import { getSkills } from '@/api-client/skills';
import { getCredentials } from '@/api-client/credentials';
import { getSubagents } from '@/api-client/subagents';
import { getRuleProviders, getProviderRules } from '@/api-client/rules';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Server } from 'lucide-react';
import type { TabId } from '@/App';

interface ImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  serverCount: number;
  error?: string;
}

interface ToolCardData {
  id: string;
  name: string;
  exists: boolean;
  serverCount: number;
  path: string;
  error?: string;
}

interface FeatureCounts {
  mcpServers: number;
  skills: number;
  rules: number;
  subagents: number;
  credentials: number;
}

const TOOL_LOGO_URLS: Record<string, string> = {
  cursor: 'https://cursor.com/apple-touch-icon.png',
  claude: 'https://cdn.simpleicons.org/claude',
  vscode: 'https://code.visualstudio.com/assets/apple-touch-icon.png',
  opencode: 'https://opencode.ai/apple-touch-icon.png',
};

interface HomeTabProps {
  onNavigate: (tab: TabId) => void;
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  const [tools, setTools] = useState<ToolCardData[]>([]);
  const [counts, setCounts] = useState<FeatureCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getImportSources(),
      getServers(),
      getSkills(),
      getCredentials(),
      getSubagents(),
      getRuleProviders(),
    ])
      .then(async ([sources, servers, skills, creds, subagents, ruleProviders]) => {
        // Build tool cards
        const mapped = sources
          .filter((s: ImportSource) => s.exists)
          .map((s: ImportSource) => ({
            id: s.id,
            name: s.name,
            exists: s.exists,
            serverCount: s.serverCount,
            path: s.path,
            error: s.error,
          }));
        setTools(mapped);

        // Fetch rules count across all providers in parallel
        let totalRules = 0;
        try {
          const rulesPerProvider = await Promise.all(
            ruleProviders.map((p: { id: string }) => getProviderRules(p.id).catch(() => []))
          );
          totalRules = rulesPerProvider.reduce((sum: number, rules) => sum + rules.length, 0);
        } catch {
          totalRules = 0;
        }

        setCounts({
          mcpServers: servers.length,
          skills: skills.length,
          rules: totalRules,
          subagents: subagents.length,
          credentials: creds.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const FEATURE_TILES: Array<{ label: string; key: keyof FeatureCounts; tab: TabId; accent: string }> = [
    { label: 'MCP Servers', key: 'mcpServers', tab: 'mcp', accent: 'text-indigo-500' },
    { label: 'Skills', key: 'skills', tab: 'skills', accent: 'text-yellow-500' },
    { label: 'Rules', key: 'rules', tab: 'rules', accent: 'text-blue-500' },
    { label: 'Subagents', key: 'subagents', tab: 'subagents', accent: 'text-purple-500' },
    { label: 'Credentials', key: 'credentials', tab: 'credentials', accent: 'text-green-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Home</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Overview of your AI tools and their installation status.
        </p>
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* Feature count tiles — 5 equal columns, full width */}
          <div className="mb-4 grid grid-cols-5 gap-3">
            {FEATURE_TILES.map(({ label, key, tab, accent }) => (
              <button
                key={key}
                type="button"
                onClick={() => onNavigate(tab)}
                className="rounded-lg p-5 text-left transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div className={`text-3xl font-bold ${accent}`}>
                  {counts?.[key] ?? '—'}
                </div>
                <div className="mt-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </button>
            ))}
          </div>

          {/* Tool cards — each full width */}
          <div className="grid grid-cols-1 gap-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onNavigate={onNavigate} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ToolCard({ tool, onNavigate }: { tool: ToolCardData; onNavigate: (tab: TabId) => void }) {
  const logoUrl = TOOL_LOGO_URLS[tool.id];
  const providerTab = `provider-${tool.id}` as TabId;

  return (
    <Card onClick={() => onNavigate(providerTab)}>
      <CardHeader>
        <span className="shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tool.name}
              width={28}
              height={28}
              className="rounded-md"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Server size={28} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{tool.name}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
          {tool.path}
        </p>
        {tool.error && (
          <p className="text-xs text-red-400 mt-1">{tool.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
