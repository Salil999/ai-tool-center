import fs from 'fs';
import path from 'path';
import os from 'os';
import { Router, Request, Response } from '../router.js';
import { validateSkillDir } from '../skills/parse.js';
import type { GetConfig } from '../types.js';

const HOME = os.homedir();
const CLAUDE_JSON = path.join(HOME, '.claude.json');
const CLAUDE_SETTINGS = path.join(HOME, '.claude', 'settings.json');
const CLAUDE_SKILLS_DIR = path.join(HOME, '.claude', 'skills');
const CLAUDE_MD = path.join(HOME, '.claude', 'CLAUDE.md');

interface McpServerSummary {
  name: string;
  type: string;
}

interface SkillSummary {
  name: string;
}

interface HookSummary {
  event: string;
  type: string;
  command?: string;
}

interface ClaudeMdSummary {
  exists: boolean;
  path: string;
  preview: string;
}

interface ProjectStatus {
  id: string;
  name: string;
  path: string;
  mcpServers: McpServerSummary[];
  localMcpServers: McpServerSummary[];
  skills: SkillSummary[];
  hooks: HookSummary[];
  claudeMd: ClaudeMdSummary;
}

interface ClaudeStatus {
  user: {
    mcpServers: McpServerSummary[];
    skills: SkillSummary[];
    hooks: HookSummary[];
    claudeMd: ClaudeMdSummary;
  };
  projects: ProjectStatus[];
}

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readMcpServers(mcpJsonPath: string): McpServerSummary[] {
  const data = readJsonSafe(mcpJsonPath);
  const servers = (data.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(servers).map(([name, def]) => ({
    name,
    type: String(def.type ?? 'stdio'),
  }));
}

function readSkillsFromDir(skillsDir: string): SkillSummary[] {
  try {
    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) return [];
    return fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && validateSkillDir(path.join(skillsDir, e.name)))
      .map((e) => ({ name: e.name }));
  } catch {
    return [];
  }
}

function readHooksFromSettings(settingsPath: string): HookSummary[] {
  const data = readJsonSafe(settingsPath);
  const hooks = (data.hooks ?? {}) as Record<string, unknown[]>;
  const result: HookSummary[] = [];
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const defs = (group as { hooks?: unknown[] }).hooks ?? [];
      for (const def of defs) {
        const d = def as Record<string, unknown>;
        const item: HookSummary = { event, type: String(d.type ?? 'command') };
        if (d.command) item.command = String(d.command);
        result.push(item);
      }
    }
  }
  return result;
}

function readLocalScopeMcpServers(projectPath: string): McpServerSummary[] {
  const claudeJson = readJsonSafe(CLAUDE_JSON);
  const projects = (claudeJson.projects ?? {}) as Record<string, Record<string, unknown>>;
  const entry = projects[projectPath];
  if (!entry) return [];
  const servers = (entry.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(servers).map(([name, def]) => ({
    name,
    type: String(def.type ?? 'stdio'),
  }));
}

function readClaudeMd(mdPath: string): ClaudeMdSummary {
  const exists = fs.existsSync(mdPath);
  if (!exists) return { exists: false, path: mdPath, preview: '' };
  try {
    const content = fs.readFileSync(mdPath, 'utf8');
    return { exists: true, path: mdPath, preview: content };
  } catch {
    return { exists: true, path: mdPath, preview: '' };
  }
}

function getUserStatus(): ClaudeStatus['user'] {
  const claudeJson = readJsonSafe(CLAUDE_JSON);
  const mcpServersRaw = (claudeJson.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
  const mcpServers: McpServerSummary[] = Object.entries(mcpServersRaw).map(([name, def]) => ({
    name,
    type: String(def.type ?? 'stdio'),
  }));

  return {
    mcpServers,
    skills: readSkillsFromDir(CLAUDE_SKILLS_DIR),
    hooks: readHooksFromSettings(CLAUDE_SETTINGS),
    claudeMd: readClaudeMd(CLAUDE_MD),
  };
}

function getProjectStatus(
  project: { id: string; name?: string; path: string }
): ProjectStatus {
  const projectPath = project.path.replace(/^~/, HOME);
  const mcpJsonPath = path.join(projectPath, '.mcp.json');
  const skillsDir = path.join(projectPath, '.claude', 'skills');
  const settingsPath = path.join(projectPath, '.claude', 'settings.json');
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  return {
    id: project.id,
    name: project.name || path.basename(projectPath),
    path: projectPath,
    mcpServers: readMcpServers(mcpJsonPath),
    localMcpServers: readLocalScopeMcpServers(projectPath),
    skills: readSkillsFromDir(skillsDir),
    hooks: readHooksFromSettings(settingsPath),
    claudeMd: readClaudeMd(claudeMdPath),
  };
}

export function createClaudeStatusRouter(getConfig: GetConfig) {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    const config = getConfig();
    const projectDirs = config.projectDirectories || [];

    const status: ClaudeStatus = {
      user: getUserStatus(),
      projects: projectDirs.map((pd) => getProjectStatus(pd)),
    };

    res.json(status);
  });

  return router;
}
