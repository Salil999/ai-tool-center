/**
 * GitHub Copilot CLI provider
 * Config: ~/.copilot/mcp-config.json (mcpServers format with type: local | http)
 * Skills: ~/.copilot/skills
 * @see https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
 */

import path from 'path';
import os from 'os';
import {
  readConfig,
  writeConfig,
  ensureDir,
  toCanonicalId,
  defToCanonical,
  HOME,
} from './utils.js';
import type { Provider } from '../types.js';
import type { Server } from '../types.js';

function getMcpPath(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  if (xdgConfig) {
    return path.join(xdgConfig, 'copilot', 'mcp-config.json');
  }
  return path.join(HOME, '.copilot', 'mcp-config.json');
}

function getSkillsPath(): string {
  return path.join(HOME, '.copilot', 'skills');
}

function importConfig(): Record<string, Omit<Server, 'id'>> {
  const configPath = getMcpPath();
  const data = readConfig(configPath);
  if (!data) throw new Error(`Config file not found: ${configPath}`);

  const servers: Record<string, Omit<Server, 'id'>> = {};
  const mcpServers = (data.mcpServers || {}) as Record<string, unknown>;
  for (const [name, def] of Object.entries(mcpServers)) {
    const raw = def as { type?: string; command?: string; url?: string; args?: string[]; env?: Record<string, string> };
    const type = raw.url ? 'http' : (raw.type === 'http' ? 'http' : 'stdio');
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, { ...raw, type }) as Omit<Server, 'id'>;
  }
  return servers;
}

function canonicalToCopilotServers(servers: Record<string, Omit<Server, 'id'>>): { mcpServers: Record<string, unknown> } {
  const mcpServers: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;
    if (s.url) {
      mcpServers[name] = {
        type: 'http',
        url: s.url,
        ...(s.headers && Object.keys(s.headers).length && { headers: s.headers }),
        tools: ['*'],
      };
    } else if (s.type === 'stdio' && s.command) {
      mcpServers[name] = {
        type: 'local',
        command: s.command,
        ...(s.args?.length && { args: s.args }),
        ...(s.env && Object.keys(s.env).length && { env: s.env }),
        tools: ['*'],
      };
    }
  }
  return { mcpServers };
}

function exportConfig(servers: Record<string, Omit<Server, 'id'>>): { path: string; success: boolean } {
  const configPath = getMcpPath();
  const data = canonicalToCopilotServers(servers);
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
  id: 'copilot',
  name: 'GitHub Copilot',
  getMcpPath,
  getSkillsPath,
  importConfig,
  exportConfig,
} satisfies Provider;
