import fs from 'fs';
import path from 'path';
import os from 'os';
import { Router, Request, Response } from '../router.js';
import type { GetConfig } from '../types.js';

const HOME = os.homedir();
const OC_CONFIG = path.join(HOME, '.config', 'opencode', 'opencode.json');
const OC_AGENTS_DIR = path.join(HOME, '.config', 'opencode', 'agents');
const OC_COMMANDS_DIR = path.join(HOME, '.config', 'opencode', 'commands');
const OC_AGENTS_MD = path.join(HOME, '.config', 'opencode', 'AGENTS.md');

interface McpServerSummary { name: string; type: string }
interface CommandFileSummary { name: string }
interface AgentFileSummary { name: string }
interface AgentsMdSummary { exists: boolean; path: string; preview: string }

interface OpenCodeProjectStatus {
  id: string;
  name: string;
  path: string;
  mcpServers: McpServerSummary[];
  commands: CommandFileSummary[];
  agents: AgentFileSummary[];
  agentsMd: AgentsMdSummary;
}

interface OpenCodeStatus {
  user: {
    mcpServers: McpServerSummary[];
    commands: CommandFileSummary[];
    agents: AgentFileSummary[];
    agentsMd: AgentsMdSummary;
  };
  projects: OpenCodeProjectStatus[];
}

function stripJsonComments(str: string): string {
  return str
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

function readOpenCodeConfig(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    try { return JSON.parse(raw) as Record<string, unknown>; }
    catch { return JSON.parse(stripJsonComments(raw)) as Record<string, unknown>; }
  } catch { return {}; }
}

function readMcpServers(configPath: string): McpServerSummary[] {
  const data = readOpenCodeConfig(configPath);
  const mcp = (data.mcp ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(mcp).map(([name, def]) => ({
    name,
    type: def.type === 'remote' ? 'http' : 'stdio',
  }));
}

function readCommandFiles(dir: string): CommandFileSummary[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ name: path.basename(f, '.md') }));
  } catch { return []; }
}

function readAgentFiles(dir: string): AgentFileSummary[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ name: path.basename(f, '.md') }));
  } catch { return []; }
}

function readAgentsMd(mdPath: string): AgentsMdSummary {
  const exists = fs.existsSync(mdPath);
  if (!exists) return { exists: false, path: mdPath, preview: '' };
  try {
    const content = fs.readFileSync(mdPath, 'utf8');
    return { exists: true, path: mdPath, preview: content };
  } catch { return { exists: true, path: mdPath, preview: '' }; }
}

export function createOpenCodeStatusRouter(getConfig: GetConfig) {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    const config = getConfig();
    const projectDirs = config.projectDirectories || [];

    const status: OpenCodeStatus = {
      user: {
        mcpServers: readMcpServers(OC_CONFIG),
        commands: readCommandFiles(OC_COMMANDS_DIR),
        agents: readAgentFiles(OC_AGENTS_DIR),
        agentsMd: readAgentsMd(OC_AGENTS_MD),
      },
      projects: projectDirs.map((pd) => {
        const projectPath = pd.path.startsWith('~')
          ? path.join(HOME, pd.path.slice(1))
          : pd.path;
        return {
          id: pd.id,
          name: pd.name || path.basename(projectPath),
          path: projectPath,
          mcpServers: readMcpServers(path.join(projectPath, 'opencode.json')),
          commands: readCommandFiles(path.join(projectPath, '.opencode', 'commands')),
          agents: readAgentFiles(path.join(projectPath, '.opencode', 'agents')),
          agentsMd: readAgentsMd(path.join(projectPath, 'AGENTS.md')),
        };
      }),
    };

    res.json(status);
  });

  return router;
}
