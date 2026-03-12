/**
 * Gemini CLI provider - https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html
 * Config: ~/.gemini/settings.json (mcpServers format)
 */

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

const CONFIG_PATH = path.join(HOME, '.gemini', 'settings.json');

function getPath(): string {
  return CONFIG_PATH;
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
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }

  const mcpData = canonicalToMcpServers(servers);
  const merged = {
    ...existing,
    mcpServers: { ...((existing.mcpServers as Record<string, unknown>) || {}), ...(mcpData.mcpServers || {}) },
  };
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

export default {
  id: 'gemini-cli',
  name: 'Gemini CLI',
  getPath,
  importConfig,
  exportConfig,
} satisfies Provider;
