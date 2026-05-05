import fs from 'fs';
import path from 'path';
import os from 'os';
import { Router, Request, Response } from '../router.js';
import type { GetConfig } from '../types.js';

const HOME = os.homedir();
const CURSOR_MCP = path.join(HOME, '.cursor', 'mcp.json');
const CURSOR_RULES_DIR = path.join(HOME, '.cursor', 'rules');
const CURSOR_AGENTS_DIR = path.join(HOME, '.cursor', 'agents');
const CURSOR_SKILLS_DIR = path.join(HOME, '.cursor', 'skills');

interface McpServerSummary { name: string; type: string }
interface RuleFileSummary { name: string }
interface AgentFileSummary { name: string }
interface SkillSummary { name: string }

interface CursorProjectStatus {
  id: string;
  name: string;
  path: string;
  mcpServers: McpServerSummary[];
  rules: RuleFileSummary[];
  agents: AgentFileSummary[];
  skills: SkillSummary[];
}

interface CursorStatus {
  user: {
    mcpServers: McpServerSummary[];
    rules: RuleFileSummary[];
    agents: AgentFileSummary[];
    skills: SkillSummary[];
  };
  projects: CursorProjectStatus[];
}

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch { return {}; }
}

function readMcpServers(mcpPath: string): McpServerSummary[] {
  const data = readJsonSafe(mcpPath);
  const servers = (data.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(servers).map(([name, def]) => ({
    name,
    type: String(def.type ?? 'stdio'),
  }));
}

function readRuleFiles(dir: string): RuleFileSummary[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.mdc') || f.endsWith('.md'))
      .map((f) => ({ name: path.basename(f, f.endsWith('.mdc') ? '.mdc' : '.md') }));
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

function readSkillDirs(dir: string): SkillSummary[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name }));
  } catch { return []; }
}

export function createCursorStatusRouter(getConfig: GetConfig) {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    const config = getConfig();
    const projectDirs = config.projectDirectories || [];

    const status: CursorStatus = {
      user: {
        mcpServers: readMcpServers(CURSOR_MCP),
        rules: readRuleFiles(CURSOR_RULES_DIR),
        agents: readAgentFiles(CURSOR_AGENTS_DIR),
        skills: readSkillDirs(CURSOR_SKILLS_DIR),
      },
      projects: projectDirs.map((pd) => {
        const projectPath = pd.path.startsWith('~')
          ? path.join(HOME, pd.path.slice(1))
          : pd.path;
        return {
          id: pd.id,
          name: pd.name || path.basename(projectPath),
          path: projectPath,
          mcpServers: readMcpServers(path.join(projectPath, '.cursor', 'mcp.json')),
          rules: readRuleFiles(path.join(projectPath, '.cursor', 'rules')),
          agents: readAgentFiles(path.join(projectPath, '.cursor', 'agents')),
          skills: readSkillDirs(path.join(projectPath, '.cursor', 'skills')),
        };
      }),
    };

    res.json(status);
  });

  return router;
}
