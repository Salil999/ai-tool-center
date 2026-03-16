import fs from 'fs';
import path from 'path';
import os from 'os';
import { slugify } from '../utils/slugify.js';
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
  let resolved: string;
  try {
    // Use realpathSync to resolve symlinks, preventing symlink traversal attacks
    resolved = fs.realpathSync(targetPath);
  } catch {
    // File may not exist yet (e.g. new config); fall back to path.resolve
    resolved = path.resolve(targetPath);
  }
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
  return slugify(name, 'server');
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
  let type: 'stdio' | 'http' | 'sse';
  if (def.url) {
    type = def.type === 'sse' || (typeof def.url === 'string' && def.url.endsWith('/sse')) ? 'sse' : 'http';
  } else {
    type = (def.type as 'stdio') || 'stdio';
  }

  // Normalize command: if command is a space-separated string (e.g. "npx @playwright/mcp@latest")
  // and no args are provided, split into command + args so providers get a clean executable name.
  let command: string | undefined;
  let args: string[] = def.args || [];
  const rawCommand = Array.isArray(def.command) ? def.command.join(' ') : def.command;
  if (rawCommand && !args.length && rawCommand.includes(' ')) {
    const parts = rawCommand.split(/\s+/);
    command = parts[0];
    args = parts.slice(1);
  } else {
    command = rawCommand;
  }

  return {
    name,
    enabled: true,
    type: type as 'stdio' | 'http' | 'sse',
    command,
    args,
    env: def.env || {},
    url: def.url,
    headers: def.headers && typeof def.headers === 'object' ? def.headers : undefined,
  };
}

/**
 * Normalize a command + args pair: if command contains spaces and args is empty,
 * split into executable + arguments. Handles already-stored broken data.
 */
export function normalizeCommand(command: string, args: string[]): { command: string; args: string[] } {
  if (!args.length && command.includes(' ')) {
    const parts = command.split(/\s+/);
    return { command: parts[0], args: parts.slice(1) };
  }
  return { command, args };
}

/**
 * Options for canonicalToNative — controls how servers are serialized for each provider format.
 */
export interface NativeFormatOptions {
  /** Top-level key wrapping the servers record. Default: 'mcpServers'. */
  wrapperKey?: string;
  /** Always include the `type` field on every server entry (e.g. Claude Code, VS Code). */
  alwaysIncludeType?: boolean;
  /** For stdio, always include `args` (even if empty). */
  alwaysIncludeArgs?: boolean;
  /** For stdio, always include `env` (even if empty). */
  alwaysIncludeEnv?: boolean;
  /** Whether to normalize (split) command strings. Default: true. */
  normalizeCommands?: boolean;
  /** Include SSE as a distinct type (VS Code). Default: false for standard format. */
  includeSseType?: boolean;
}

/**
 * Unified canonical-to-native server format conversion.
 * Replaces the three separate functions (canonicalToMcpServers, canonicalToClaudeMcpServers, canonicalToVSCodeServers).
 */
export function canonicalToNative(
  servers: Record<string, Omit<Server, 'id'>>,
  options: NativeFormatOptions = {}
): Record<string, Record<string, unknown>> {
  const {
    wrapperKey = 'mcpServers',
    alwaysIncludeType = false,
    alwaysIncludeArgs = false,
    alwaysIncludeEnv = false,
    normalizeCommands = true,
    includeSseType = false,
  } = options;

  const result: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;

    if (s.url) {
      const isSse = s.type === 'sse' || s.url.endsWith('/sse');
      const entry: Record<string, unknown> = { url: s.url };
      if (alwaysIncludeType) {
        entry.type = (includeSseType && isSse) ? 'sse' : isSse ? 'sse' : 'http';
      }
      if (s.headers && Object.keys(s.headers).length) entry.headers = s.headers;
      result[name] = entry;
    } else if (s.type === 'stdio' && s.command) {
      const { command, args } = normalizeCommands
        ? normalizeCommand(s.command, s.args || [])
        : { command: s.command, args: s.args || [] };
      const entry: Record<string, unknown> = {};
      if (alwaysIncludeType) entry.type = 'stdio';
      entry.command = command;
      if (args.length || alwaysIncludeArgs) entry.args = args;
      const hasEnv = s.env && Object.keys(s.env).length;
      if (hasEnv || alwaysIncludeEnv) entry.env = hasEnv ? s.env : {};
      result[name] = entry;
    } else if (includeSseType && s.type === 'sse' && s.url) {
      const entry: Record<string, unknown> = { url: s.url };
      if (alwaysIncludeType) entry.type = 'sse';
      if (s.headers && Object.keys(s.headers).length) entry.headers = s.headers;
      result[name] = entry;
    }
  }
  return { [wrapperKey]: result };
}

/** Standard mcpServers format preset (Cursor, Augment, Claude Desktop, Custom). */
export const FORMAT_STANDARD: NativeFormatOptions = {};

/** Claude Code format preset: always includes type, args, env. */
export const FORMAT_CLAUDE: NativeFormatOptions = {
  alwaysIncludeType: true,
  alwaysIncludeArgs: true,
  alwaysIncludeEnv: true,
};

/** VS Code format preset: uses 'servers' key, always includes type, supports SSE. */
export const FORMAT_VSCODE: NativeFormatOptions = {
  wrapperKey: 'servers',
  alwaysIncludeType: true,
  normalizeCommands: false,
  includeSseType: true,
};

/**
 * Canonical server to mcpServers format (Cursor, Claude Desktop, etc.).
 */
export function canonicalToMcpServers(servers: Record<string, Omit<Server, 'id'>>): { mcpServers: Record<string, unknown> } {
  return canonicalToNative(servers, FORMAT_STANDARD) as { mcpServers: Record<string, unknown> };
}

/**
 * Export servers to a JSON file at the given path (e.g. project/.cursor/mcp.json).
 */
export function exportToMcpPath(
  servers: Record<string, Omit<Server, 'id'>>,
  filePath: string,
  configKey = 'mcpServers'
): { path: string; success: boolean } {
  const resolved = resolvePath(filePath);
  if (!isPathSafe(resolved)) throw new Error('Path is not allowed');
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

/**
 * Claude Code MCP format (~/.claude.json):
 * Always includes type, args, env fields.
 */
export function canonicalToClaudeMcpServers(
  servers: Record<string, Omit<Server, 'id'>>
): { mcpServers: Record<string, unknown> } {
  return canonicalToNative(servers, FORMAT_CLAUDE) as { mcpServers: Record<string, unknown> };
}

/**
 * Canonical server to VS Code servers format.
 */
export function canonicalToVSCodeServers(servers: Record<string, Omit<Server, 'id'>>): { servers: Record<string, unknown> } {
  return canonicalToNative(servers, FORMAT_VSCODE) as { servers: Record<string, unknown> };
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
 * Factory for MCP providers that use the standard mcpServers JSON format (Cursor, Claude, etc.).
 * Reduces boilerplate across providers that share the same import/export logic.
 */
export interface CreateMcpProviderOptions {
  id: string;
  name: string;
  getMcpPath: () => string;
  getSkillsPath?: () => string;
  getRulesPath?: () => string;
  /** 'replace' (default): overwrite entire config with mcpServers. 'merge-mcp': merge mcpServers into existing config. */
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
