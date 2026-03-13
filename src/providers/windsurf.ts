/**
 * Windsurf (Codeium) provider - https://docs.codeium.com/windsurf/mcp
 * Config: ~/.codeium/windsurf/mcp_config.json (mcpServers format, same as Claude)
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
    return path.join(process.env.USERPROFILE || HOME, '.codeium', 'windsurf', 'mcp_config.json');
  }
  return path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
}

function importConfig(): Record<string, import('../types.js').Server> {
  const configPath = getMcpPath();
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
  const configPath = getMcpPath();
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
  id: 'windsurf',
  name: 'Windsurf',
  getMcpPath,
  importConfig,
  exportConfig,
} satisfies Provider;
