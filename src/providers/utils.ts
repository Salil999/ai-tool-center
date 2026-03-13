import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AppConfig, Server } from '../types.js';

export const HOME = os.homedir();

/**
 * Return servers as a record with keys in display/sync order.
 * Uses serverOrder when present; otherwise preserves existing key order.
 */
export function getOrderedServers(config: AppConfig): Record<string, Omit<Server, 'id'>> {
  const servers = config.servers || {};
  const order = config.serverOrder || Object.keys(servers);
  const orderedIds = order.filter((id) => servers[id]);
  const extraIds = Object.keys(servers).filter((id) => !orderedIds.includes(id));
  const ids = [...orderedIds, ...extraIds];
  const result: Record<string, Omit<Server, 'id'>> = {};
  for (const id of ids) {
    result[id] = servers[id];
  }
  return result;
}

export function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const homeResolved = path.resolve(HOME);
  return resolved.startsWith(homeResolved) || resolved.startsWith(path.resolve(process.cwd()));
}

export function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readConfig(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

export function writeConfig(filePath: string, data: Record<string, unknown>): void {
  if (!isPathSafe(filePath)) {
    throw new Error('Path is outside allowed directories');
  }
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function expandPath(p: string | unknown): string | unknown {
  if (typeof p !== 'string') return p;
  if (p.startsWith('~/') || p === '~') {
    return path.join(HOME, p.slice(1));
  }
  return p;
}

export function resolvePath(filePath: string): string {
  return path.resolve(expandPath(filePath));
}

/**
 * Convert display name to canonical id (lowercase, hyphenated).
 */
export function toCanonicalId(name: string): string {
  return (name || 'server').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'server';
}

interface ProviderDef {
  type?: string;
  command?: string | string[];
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

/**
 * Parse provider format to canonical: { id -> { name, enabled, type, command?, args?, env?, url? } }
 */
export function defToCanonical(name: string, def: ProviderDef): Omit<Server, 'id'> {
  const type = def.url ? 'http' : (def.type || 'stdio');
  return {
    name,
    enabled: true,
    type: type as 'stdio' | 'http' | 'sse',
    command: def.command as string | undefined,
    args: def.args || [],
    env: def.env || {},
    url: def.url,
    headers: def.headers && typeof def.headers === 'object' ? def.headers : undefined,
  };
}

/**
 * Canonical server to mcpServers format (Cursor/Claude).
 */
export function canonicalToMcpServers(servers: Record<string, Omit<Server, 'id'>>): { mcpServers: Record<string, unknown> } {
  const mcpServers: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;
    if (s.url) {
      mcpServers[name] = { url: s.url, ...(s.headers && { headers: s.headers }) };
    } else if (s.type === 'stdio' && s.command) {
      mcpServers[name] = {
        command: s.command,
        ...(s.args?.length && { args: s.args }),
        ...(s.env && Object.keys(s.env).length && { env: s.env }),
      };
    }
  }
  return { mcpServers };
}

/**
 * Canonical server to VS Code servers format.
 */
export function canonicalToVSCodeServers(servers: Record<string, Omit<Server, 'id'>>): { servers: Record<string, unknown> } {
  const vsServers: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;
    if (s.url) {
      vsServers[name] = { type: 'http', url: s.url, ...(s.headers && { headers: s.headers }) };
    } else if (s.type === 'stdio' && s.command) {
      vsServers[name] = {
        type: 'stdio',
        command: s.command,
        ...(s.args?.length && { args: s.args }),
        ...(s.env && Object.keys(s.env).length && { env: s.env }),
      };
    } else if (s.type === 'sse' && s.url) {
      vsServers[name] = { type: 'sse', url: s.url, ...(s.headers && { headers: s.headers }) };
    }
  }
  return { servers: vsServers };
}

/**
 * Normalize server for duplicate comparison (url or command + args).
 */
export function serverSignature(server: Omit<Server, 'id'>): string | null {
  if (server.url) {
    try {
      const u = new URL(server.url);
      return `url:${u.origin}${u.pathname}`;
    } catch {
      return `url:${String(server.url)}`;
    }
  }
  if (server.command) {
    const args = (server.args || []).join(' ');
    return `stdio:${String(server.command).trim()} ${args}`.trim();
  }
  return null;
}

/**
 * Check if a server is a duplicate of any existing server (same url or command).
 */
export function isDuplicate(server: Omit<Server, 'id'>, existing: Record<string, Omit<Server, 'id'>>): boolean {
  const sig = serverSignature(server);
  if (!sig) return false;
  for (const s of Object.values(existing)) {
    if (serverSignature(s) === sig) return true;
  }
  return false;
}

/**
 * Factory for MCP providers that use the standard mcpServers JSON format (Cursor, Claude, ChatGPT, etc.).
 * Reduces boilerplate across providers that share the same import/export logic.
 */
export interface CreateMcpProviderOptions {
  id: string;
  name: string;
  getMcpPath: () => string;
  getSkillsPath?: () => string;
  getRulesPath?: () => string;
  /** 'replace' (default): overwrite entire config with mcpServers. 'merge-mcp': merge mcpServers into existing config (e.g. gemini-cli). */
  mergeStrategy?: 'replace' | 'merge-mcp';
}

export function createMcpProvider(options: CreateMcpProviderOptions): import('../types.js').Provider {
  const {
    id,
    name,
    getMcpPath,
    getSkillsPath,
    getRulesPath,
    mergeStrategy = 'replace',
  } = options;

  function importConfig(): Record<string, Omit<Server, 'id'>> {
    const configPath = getMcpPath();
    const data = readConfig(configPath);
    if (!data) throw new Error(`Config file not found: ${configPath}`);

    const servers: Record<string, Omit<Server, 'id'>> = {};
    const mcpServers = (data.mcpServers || {}) as Record<string, unknown>;
    for (const [n, def] of Object.entries(mcpServers)) {
      const canonicalId = toCanonicalId(n);
      servers[canonicalId] = defToCanonical(n, def as Parameters<typeof defToCanonical>[1]) as Omit<Server, 'id'>;
    }
    return servers;
  }

  function exportConfig(servers: Record<string, Omit<Server, 'id'>>): { path: string; success: boolean } {
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
    const merged =
      mergeStrategy === 'merge-mcp'
        ? {
            ...existing,
            mcpServers: {
              ...((existing.mcpServers as Record<string, unknown>) || {}),
              ...(data.mcpServers || {}),
            },
          }
        : { ...existing, ...data };
    writeConfig(configPath, merged);
    return { path: configPath, success: true };
  }

  return {
    id,
    name,
    getMcpPath,
    getSkillsPath,
    getRulesPath,
    importConfig,
    exportConfig,
  };
}

/**
 * Merge imported servers into existing, avoiding id collisions and skipping duplicates.
 * A server is considered a duplicate if it has the same url (for HTTP) or command+args (for stdio).
 */
export function mergeServers(
  existing: Record<string, Omit<Server, 'id'>>,
  imported: Record<string, Omit<Server, 'id'>>
): Record<string, Omit<Server, 'id'>> {
  const merged = { ...existing };
  let suffix = 1;
  for (const [id, server] of Object.entries(imported)) {
    if (isDuplicate(server, merged)) continue;
    let finalId = id;
    while (merged[finalId]) {
      finalId = `${id}-${suffix++}`;
    }
    merged[finalId] = server;
  }
  return merged;
}
