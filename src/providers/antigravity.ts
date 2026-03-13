/**
 * Antigravity (Google) provider - https://antigravity.codes/blog/antigravity-mcp-tutorial
 * Config: ~/.antigravity_tools/mcp_config.json (mcpServers format)
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

function getMcpPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE || process.env.HOME || HOME, '.antigravity_tools', 'mcp_config.json');
  }
  return path.join(HOME, '.antigravity_tools', 'mcp_config.json');
}

function importConfig(): Record<string, import('../types.js').Server> {
  const configPath = getPath();
  const data = readConfig(configPath);
  if (!data) throw new Error(`Config file not found: ${configPath}`);

  const servers: Record<string, import('../types.js').Server> = {};
  const mcpServers = (data.mcpServers || {}) as Record<string, unknown>;
  for (const [name, def] of Object.entries(mcpServers)) {
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, def as Parameters<typeof defToCanonical>[1]) as import('../types.js').Server;
  }
  return servers;
}

function exportConfig(servers: Record<string, import('../types.js').Server>): { path: string; success: boolean } {
  const configPath = getPath();
  const data = canonicalToMcpServers(servers);
  ensureDir(configPath);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(configPath);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }
  const merged = { ...existing, ...data };
  writeConfig(configPath, merged);
  return { path: configPath, success: true };
}

export default {
  id: 'antigravity',
  name: 'Antigravity',
  getMcpPath,
  importConfig,
  exportConfig,
} satisfies Provider;
