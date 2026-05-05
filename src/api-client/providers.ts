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

// ── Cursor ────────────────────────────────────────────────────────────────────

export interface RuleFileSummary { name: string }
export interface AgentFileSummary { name: string }

export interface CursorProjectStatus {
  id: string;
  name: string;
  path: string;
  mcpServers: McpServerSummary[];
  rules: RuleFileSummary[];
  agents: AgentFileSummary[];
  skills: SkillSummary[];
}

export interface CursorStatus {
  user: {
    mcpServers: McpServerSummary[];
    rules: RuleFileSummary[];
    agents: AgentFileSummary[];
    skills: SkillSummary[];
  };
  projects: CursorProjectStatus[];
}

export async function getCursorStatus(): Promise<CursorStatus> {
  return fetchJSON<CursorStatus>(apiUrl('/providers/cursor/status'));
}

// ── OpenCode ──────────────────────────────────────────────────────────────────

export interface CommandFileSummary { name: string }
export interface AgentsMdSummary { exists: boolean; path: string; preview: string }

export interface OpenCodeProjectStatus {
  id: string;
  name: string;
  path: string;
  mcpServers: McpServerSummary[];
  commands: CommandFileSummary[];
  agents: AgentFileSummary[];
  agentsMd: AgentsMdSummary;
}

export interface OpenCodeStatus {
  user: {
    mcpServers: McpServerSummary[];
    commands: CommandFileSummary[];
    agents: AgentFileSummary[];
    agentsMd: AgentsMdSummary;
  };
  projects: OpenCodeProjectStatus[];
}

export async function getOpenCodeStatus(): Promise<OpenCodeStatus> {
  return fetchJSON<OpenCodeStatus>(apiUrl('/providers/opencode/status'));
}

