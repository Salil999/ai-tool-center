/**
 * Codex (OpenAI) provider - https://developers.openai.com/codex/config-sample/
 * Config: ~/.codex/config.toml
 * Format: [mcp_servers.name] with command/args/env (STDIO) or url/bearer_token_env_var/http_headers (HTTP)
 */

const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');
const {
  ensureDir,
  toCanonicalId,
  isPathSafe,
  HOME,
} = require('./utils');

const CONFIG_PATH = path.join(HOME, '.codex', 'config.toml');

function getPath() {
  return CONFIG_PATH;
}

function readTomlConfig(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return toml.parse(raw);
}

function writeTomlConfig(filePath, data) {
  if (!isPathSafe(filePath)) {
    throw new Error('Path is outside allowed directories');
  }
  ensureDir(filePath);
  fs.writeFileSync(filePath, toml.stringify(data), 'utf8');
}

function importConfig() {
  const data = readTomlConfig(CONFIG_PATH);
  if (!data) throw new Error(`Config file not found: ${CONFIG_PATH}`);

  const servers = {};
  const mcpServers = data.mcp_servers || {};
  for (const [name, def] of Object.entries(mcpServers)) {
    if (!def || typeof def !== 'object') continue;
    const id = toCanonicalId(name);
    const enabled = def.enabled !== false;

    if (def.url) {
      const headers = def.http_headers || {};
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

function canonicalToCodexMcp(servers) {
  const mcpServers = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;

    if (s.url) {
      mcpServers[name] = {
        enabled: true,
        url: s.url,
      };
      if (s.headers && Object.keys(s.headers).length) {
        mcpServers[name].http_headers = s.headers;
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

function exportConfig(servers) {
  ensureDir(CONFIG_PATH);
  let existing = {};
  try {
    const raw = readTomlConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch (_) {}

  const mcpData = canonicalToCodexMcp(servers);
  const merged = {
    ...existing,
    mcp_servers: { ...(existing.mcp_servers || {}), ...mcpData },
  };
  writeTomlConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

module.exports = {
  id: 'codex',
  name: 'Codex',
  getPath,
  importConfig,
  exportConfig,
};
