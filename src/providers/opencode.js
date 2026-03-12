/**
 * OpenCode provider - https://opencode.ai/docs/mcp-servers/
 * Config: ~/.config/opencode/opencode.json
 * Format: mcp: { name: { type: "local"|"remote", command?, url?, environment?, headers?, enabled? } }
 */

const path = require('path');
const fs = require('fs');
const {
  readConfig,
  writeConfig,
  ensureDir,
  toCanonicalId,
  HOME,
} = require('./utils');

const CONFIG_PATH = path.join(HOME, '.config', 'opencode', 'opencode.json');

function getPath() {
  return CONFIG_PATH;
}

/**
 * Strip JSONC comments for parsing. OpenCode supports both JSON and JSONC.
 */
function stripJsonComments(str) {
  return str
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

function readOpenCodeConfig(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(stripJsonComments(raw));
  }
}

/**
 * OpenCode local: { type: "local", command: ["npx", "-y", "..."], environment?: {} }
 * OpenCode remote: { type: "remote", url: "...", headers?: {} }
 */
function importConfig() {
  const data = readOpenCodeConfig(CONFIG_PATH);
  if (!data) throw new Error(`Config file not found: ${CONFIG_PATH}`);

  const servers = {};
  const mcp = data.mcp || {};
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
function canonicalToOpenCodeMcp(servers) {
  const mcp = {};
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

function exportConfig(servers) {
  ensureDir(CONFIG_PATH);
  let existing = {};
  try {
    const raw = readOpenCodeConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch (_) {}

  const mcpData = canonicalToOpenCodeMcp(servers);
  const merged = {
    ...existing,
    mcp: { ...(existing.mcp || {}), ...mcpData },
  };
  if (!existing.$schema) {
    merged.$schema = 'https://opencode.ai/config.json';
  }
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

module.exports = {
  id: 'opencode',
  name: 'OpenCode',
  getPath,
  importConfig,
  exportConfig,
};
