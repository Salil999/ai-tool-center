/**
 * OpenCode provider - https://opencode.ai/docs/mcp-servers/
 * Config: ~/.config/opencode/opencode.json
 * Format: mcp: { name: { type: "local"|"remote", command?, url?, environment?, headers?, enabled? } }
 */

import path from 'path';
import fs from 'fs';
import {
  readConfig,
  writeConfig,
  ensureDir,
  toCanonicalId,
  HOME,
} from './utils.js';
import type { Provider } from '../types.js';

const CONFIG_PATH = path.join(HOME, '.config', 'opencode', 'opencode.json');

function getMcpPath(): string {
  return CONFIG_PATH;
}

/**
 * Strip JSONC comments for parsing. OpenCode supports both JSON and JSONC.
 */
function stripJsonComments(str: string): string {
  return str
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

function readOpenCodeConfig(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return JSON.parse(stripJsonComments(raw)) as Record<string, unknown>;
  }
}

interface OpenCodeDef {
  type?: string;
  command?: string | string[];
  url?: string;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
  enabled?: boolean;
}

/**
 * OpenCode local: { type: "local", command: ["npx", "-y", "..."], environment?: {} }
 * OpenCode remote: { type: "remote", url: "...", headers?: {} }
 */
function importConfig(): Record<string, import('../types.js').Server> {
  const data = readOpenCodeConfig(CONFIG_PATH);
  if (!data) throw new Error(`Config file not found: ${CONFIG_PATH}`);

  const servers: Record<string, import('../types.js').Server> = {};
  const mcp = (data.mcp || {}) as Record<string, OpenCodeDef>;
  for (const [name, def] of Object.entries(mcp)) {
    if (!def || typeof def !== 'object') continue;
    const id = toCanonicalId(name);
    const type = def.type === 'remote' ? 'http' : 'stdio';
    const enabled = def.enabled !== false;

    if (def.type === 'remote' && def.url) {
      servers[id] = {
        name,
        enabled,
        type: 'http',
        url: def.url,
        headers: def.headers && typeof def.headers === 'object' ? def.headers : undefined,
      };
    } else if ((def.type === 'local' || def.type !== 'remote') && def.command) {
      const cmdArr = Array.isArray(def.command) ? def.command : [String(def.command)];
      const command = cmdArr[0];
      const args = cmdArr.slice(1);
      servers[id] = {
        name,
        enabled,
        type: 'stdio',
        command: command || '',
        args: args || [],
        env: (def.environment && typeof def.environment === 'object') ? def.environment : {},
      };
    }
  }
  return servers;
}

/**
 * Canonical -> OpenCode mcp format.
 */
function canonicalToOpenCodeMcp(servers: Record<string, import('../types.js').Server>): Record<string, unknown> {
  const mcp: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers)) {
    const name = s.name || id;
    const enabled = s.enabled !== false;

    if (s.url) {
      mcp[name] = {
        type: 'remote',
        url: s.url,
        enabled,
        ...(s.headers && Object.keys(s.headers).length && { headers: s.headers }),
      };
    } else if (s.type === 'stdio' && s.command) {
      const cmdArr = [String(s.command), ...(s.args || [])];
      mcp[name] = {
        type: 'local',
        command: cmdArr,
        enabled,
        ...(s.env && Object.keys(s.env).length && { environment: s.env }),
      };
    }
  }
  return mcp;
}

function exportConfig(servers: Record<string, import('../types.js').Server>): { path: string; success: boolean } {
  ensureDir(CONFIG_PATH);
  let existing: Record<string, unknown> = {};
  try {
    const raw = readOpenCodeConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch {
    /* ignore */
  }

  const mcpData = canonicalToOpenCodeMcp(servers);
  const merged = {
    ...existing,
    mcp: { ...((existing.mcp as Record<string, unknown>) || {}), ...mcpData },
  };
  if (!(existing as { $schema?: string }).$schema) {
    (merged as Record<string, unknown>).$schema = 'https://opencode.ai/config.json';
  }
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

export default {
  id: 'opencode',
  name: 'OpenCode',
  getMcpPath,
  importConfig,
  exportConfig,
} satisfies Provider;
