/**
 * Codex (OpenAI) provider - https://developers.openai.com/codex/config-sample/
 * Config: ~/.codex/config.toml
 * Format: [mcp_servers.name] with command/args/env (STDIO) or url/bearer_token_env_var/http_headers (HTTP)
 */

import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';
import {
  ensureDir,
  toCanonicalId,
  isPathSafe,
  HOME,
} from './utils.js';
import type { Provider } from '../types.js';

const CONFIG_PATH = path.join(HOME, '.codex', 'config.toml');

function getPath(): string {
  return CONFIG_PATH;
}

function readTomlConfig(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return toml.parse(raw) as Record<string, unknown>;
}

function writeTomlConfig(filePath: string, data: Record<string, unknown>): void {
  if (!isPathSafe(filePath)) {
    throw new Error('Path is outside allowed directories');
  }
  ensureDir(filePath);
  fs.writeFileSync(filePath, toml.stringify(data as Record<string, unknown>), 'utf8');
}

interface CodexDef {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  http_headers?: Record<string, string>;
  bearer_token_env_var?: string;
  env_http_headers?: Record<string, string>;
  enabled?: boolean;
}

function importConfig(): Record<string, import('../types.js').Server> {
  const data = readTomlConfig(CONFIG_PATH);
  if (!data) throw new Error(`Config file not found: ${CONFIG_PATH}`);

  const servers: Record<string, import('../types.js').Server> = {};
  const mcpServers = (data.mcp_servers || {}) as Record<string, CodexDef>;
  for (const [name, def] of Object.entries(mcpServers)) {
    if (!def || typeof def !== 'object') continue;
    const id = toCanonicalId(name);
    const enabled = def.enabled !== false;

    if (def.url) {
      const headers: Record<string, string> = def.http_headers || {};
      if (def.bearer_token_env_var && process.env[def.bearer_token_env_var]) {
        headers.Authorization = `Bearer ${process.env[def.bearer_token_env_var]}`;
      }
      if (def.env_http_headers) {
        for (const [h, envKey] of Object.entries(def.env_http_headers)) {
          if (process.env[envKey]) headers[h] = process.env[envKey];
        }
      }
      servers[id] = {
        name,
        enabled,
        type: 'http',
        url: def.url,
        headers: Object.keys(headers).length ? headers : undefined,
      };
    } else if (def.command) {
      servers[id] = {
        name,
        enabled,
        type: 'stdio',
        command: def.command,
        args: Array.isArray(def.args) ? def.args : [],
        env: (def.env && typeof def.env === 'object') ? def.env : {},
      };
    }
  }
  return servers;
}

function canonicalToCodexMcp(servers: Record<string, import('../types.js').Server>): Record<string, unknown> {
  const mcpServers: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;

    if (s.url) {
      mcpServers[name] = {
        enabled: true,
        url: s.url,
      };
      if (s.headers && Object.keys(s.headers).length) {
        (mcpServers[name] as Record<string, unknown>).http_headers = s.headers;
      }
    } else if (s.type === 'stdio' && s.command) {
      mcpServers[name] = {
        enabled: true,
        command: s.command,
        ...(s.args?.length && { args: s.args }),
        ...(s.env && Object.keys(s.env).length && { env: s.env }),
      };
    }
  }
  return mcpServers;
}

function exportConfig(servers: Record<string, import('../types.js').Server>): { path: string; success: boolean } {
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readTomlConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }

  const mcpData = canonicalToCodexMcp(servers);
  const merged = {
    ...existing,
    mcp_servers: { ...((existing.mcp_servers as Record<string, unknown>) || {}), ...mcpData },
  };
  writeTomlConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

export default {
  id: 'codex',
  name: 'Codex',
  getPath,
  importConfig,
  exportConfig,
} satisfies Provider;
