import path from 'path';
import {
  createMcpProvider,
  HOME,
  canonicalToClaudeMcpServers,
  readConfig,
  writeConfig,
  ensureDir,
  isPathSafe,
  resolvePath,
} from './utils.js';
import type { Server } from '../types.js';

const CONFIG_PATH = path.join(HOME, '.claude.json');
const baseProvider = createMcpProvider({
  id: 'claude',
  name: 'Claude Code',
  getMcpPath: () => CONFIG_PATH,
});

/**
 * Claude Code stores MCP servers in ~/.claude.json with per-project overrides.
 * Project-specific projects[path].mcpServers overrides the top-level mcpServers
 * with no inheritance—empty {} means "no servers" for that project.
 * We populate project entries that have empty mcpServers so synced servers
 * appear when the user is in any project.
 */
function exportConfig(servers: Record<string, Omit<Server, 'id'>>): { path: string; success: boolean } {
  const data = canonicalToClaudeMcpServers(servers);
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }

  const merged = { ...existing, ...data };
  const mcpServers = (merged.mcpServers || {}) as Record<string, unknown>;

  // Sync project-specific mcpServers so servers appear in each project.
  // Always update to keep project configs in sync with the canonical set.
  const projects = (merged.projects || {}) as Record<string, Record<string, unknown>>;
  for (const projectPath of Object.keys(projects)) {
    const project = projects[projectPath];
    if (project && typeof project === 'object') {
      project.mcpServers = { ...mcpServers };
    }
  }
  merged.projects = projects;

  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

/**
 * User scope: write only to top-level mcpServers in ~/.claude.json.
 * Does not touch projects.
 */
export function exportToClaudeUserScope(
  servers: Record<string, Omit<Server, 'id'>>
): { path: string; success: boolean } {
  const data = canonicalToClaudeMcpServers(servers);
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }
  const merged = { ...existing, mcpServers: data.mcpServers };
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

/**
 * Local scope: write to projects[projectPath].mcpServers in ~/.claude.json.
 * Only updates the specified project path; leaves other projects unchanged.
 */
export function exportToClaudeLocalScope(
  servers: Record<string, Omit<Server, 'id'>>,
  projectPath: string
): { path: string; success: boolean } {
  const data = canonicalToClaudeMcpServers(servers);
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }
  const projects = (existing.projects || {}) as Record<string, Record<string, unknown>>;
  if (!projects[projectPath]) {
    projects[projectPath] = {};
  }
  projects[projectPath].mcpServers = data.mcpServers;
  const merged = { ...existing, projects };
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

/**
 * Project scope: write to {projectPath}/.mcp.json with Claude Code format.
 * Shared via version control, team-visible.
 */
export function exportToClaudeProjectScope(
  servers: Record<string, Omit<Server, 'id'>>,
  projectPath: string
): { path: string; success: boolean } {
  const data = canonicalToClaudeMcpServers(servers);
  const mcpPath = path.join(resolvePath(projectPath), '.mcp.json');
  if (!isPathSafe(mcpPath)) {
    throw new Error('Path is not allowed');
  }
  ensureDir(mcpPath);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(mcpPath);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }
  const merged = { ...existing, mcpServers: data.mcpServers };
  writeConfig(mcpPath, merged);
  return { path: mcpPath, success: true };
}

export default {
  ...baseProvider,
  exportConfig,
};
