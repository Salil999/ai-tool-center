import path from 'path';
import {
  readConfig,
  writeConfig,
  ensureDir,
  toCanonicalId,
  defToCanonical,
  canonicalToMcpServers,
  HOME,
} from './utils.js';
import type { Provider } from '../types.js';

const CONFIG_PATH = path.join(HOME, '.cursor', 'mcp.json');
const SKILLS_PATH = path.join(HOME, '.cursor', 'skills');
const RULES_PATH = path.join(HOME, '.cursor', 'rules');

function getMcpPath(): string {
  return CONFIG_PATH;
}

function getSkillsPath(): string {
  return SKILLS_PATH;
}

function getRulesPath(): string {
  return RULES_PATH;
}

function importConfig(): Record<string, import('../types.js').Server> {
  const data = readConfig(CONFIG_PATH);
  if (!data) throw new Error(`Config file not found: ${CONFIG_PATH}`);

  const servers: Record<string, import('../types.js').Server> = {};
  const mcpServers = (data.mcpServers || {}) as Record<string, unknown>;
  for (const [name, def] of Object.entries(mcpServers)) {
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, def as Parameters<typeof defToCanonical>[1]) as import('../types.js').Server;
  }
  return servers;
}

function exportConfig(servers: Record<string, import('../types.js').Server>): { path: string; success: boolean } {
  const data = canonicalToMcpServers(servers);
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }
  const merged = { ...existing, ...data };
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

export default {
  id: 'cursor',
  name: 'Cursor',
  getMcpPath,
  getSkillsPath,
  getRulesPath,
  importConfig,
  exportConfig,
} satisfies Provider;
