import path from 'path';
import {
  readConfig,
  writeConfig,
  toCanonicalId,
  defToCanonical,
  canonicalToVSCodeServers,
  HOME,
} from './utils.js';
import type { Provider } from '../types.js';

function getMcpPath(): string {
  const baseDir =
    process.platform === 'darwin'
      ? path.join(HOME, 'Library', 'Application Support', 'Code', 'User')
      : process.platform === 'win32'
        ? path.join(process.env.APPDATA || HOME, 'Code', 'User')
        : path.join(HOME, '.config', 'Code', 'User');
  return path.join(baseDir, 'mcp.json');
}

function importConfig(): Record<string, import('../types.js').Server> {
  const configPath = getMcpPath();
  const data = readConfig(configPath);
  if (!data) throw new Error(`Config file not found: ${configPath}`);

  const servers: Record<string, import('../types.js').Server> = {};
  const vsServers = (data.servers || {}) as Record<string, unknown>;
  for (const [name, def] of Object.entries(vsServers)) {
    const id = toCanonicalId(name);
    const type = (def as { type?: string; url?: string }).type || ((def as { url?: string }).url ? 'http' : 'stdio');
    servers[id] = defToCanonical(name, { ...(def as object), type }) as import('../types.js').Server;
  }
  return servers;
}

function exportConfig(servers: Record<string, import('../types.js').Server>): { path: string; success: boolean } {
  const configPath = getMcpPath();
  const data = canonicalToVSCodeServers(servers);
  let existing: { servers: Record<string, unknown>; inputs: unknown[] } = { servers: {}, inputs: [] };
  try {
    const raw = readConfig(configPath);
    if (raw) existing = { servers: (raw.servers as Record<string, unknown>) || {}, inputs: (raw.inputs as unknown[]) || [] };
  } catch {
    /* ignore */
  }
  const merged = { ...existing, servers: { ...existing.servers, ...data.servers } };
  writeConfig(configPath, merged);
  return { path: configPath, success: true };
}

export default {
  id: 'vscode',
  name: 'VS Code',
  getMcpPath,
  importConfig,
  exportConfig,
} satisfies Provider;
