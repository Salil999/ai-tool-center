import { apiUrl, fetchJSON } from './fetch';

export interface BuiltinProvider {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  capabilities: { mcp: boolean; skills: boolean; rules: boolean };
}

export interface ProvidersResponse {
  builtin: BuiltinProvider[];
}

export async function getProviders(): Promise<ProvidersResponse> {
  return fetchJSON<ProvidersResponse>(apiUrl('/providers'));
}

export async function updateEnabledProviders(enabledProviders: string[]): Promise<{ enabledProviders: string[] }> {
  return fetchJSON<{ enabledProviders: string[] }>(apiUrl('/providers/enabled'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabledProviders }),
  });
}

export interface McpServerSummary { name: string; type: string }
export interface SkillSummary { name: string }
export interface HookSummary { event: string; type: string; command?: string }
export interface ClaudeMdSummary { exists: boolean; path: string; preview: string }

export interface ClaudeProjectStatus {
  id: string;
  name: string;
  path: string;
  mcpServers: McpServerSummary[];
  localMcpServers?: McpServerSummary[];
  skills: SkillSummary[];
  hooks: HookSummary[];
  claudeMd: ClaudeMdSummary;
}

export interface ClaudeStatus {
  user: {
    mcpServers: McpServerSummary[];
    skills: SkillSummary[];
    hooks: HookSummary[];
    claudeMd: ClaudeMdSummary;
  };
  projects: ClaudeProjectStatus[];
}

export async function getClaudeStatus(): Promise<ClaudeStatus> {
  return fetchJSON<ClaudeStatus>(apiUrl('/providers/claude/status'));
}

