import {
  readConfig,
  writeConfig,
  isPathSafe,
  resolvePath,
  toCanonicalId,
  defToCanonical,
  canonicalToMcpServers,
} from './utils.js';
import type { Provider } from '../types.js';

export function importConfig(filePath: string, configKey = 'mcpServers'): Record<string, import('../types.js').Server> {
  const resolved = resolvePath(filePath);
  if (!isPathSafe(resolved)) throw new Error('Path is not allowed');

  const data = readConfig(resolved);
  if (!data) throw new Error(`File not found: ${resolved}`);

  const serversRaw = data[configKey];
  if (!serversRaw || typeof serversRaw !== 'object') {
    throw new Error(`No "${configKey}" key found in file`);
  }

  const servers: Record<string, import('../types.js').Server> = {};
  for (const [name, def] of Object.entries(serversRaw as Record<string, unknown>)) {
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, def as Parameters<typeof defToCanonical>[1]) as import('../types.js').Server;
  }
  return servers;
}

export function exportConfig(
  servers: Record<string, import('../types.js').Server>,
  filePath: string,
  configKey = 'mcpServers'
): { path: string; success: boolean } {
  const resolved = resolvePath(filePath);
  if (!filePath || !isPathSafe(resolved)) {
    throw new Error('Invalid or unsafe custom path');
  }

  const data = canonicalToMcpServers(servers);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readConfig(resolved);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }
  const merged = { ...existing, [configKey]: data.mcpServers };
  writeConfig(resolved, merged);
  return { path: resolved, success: true };
}

export default {
  id: 'custom',
  name: 'Custom',
  importConfig,
  exportConfig,
};
