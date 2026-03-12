/**
 * Gemini CLI provider - https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html
 * Config: ~/.gemini/settings.json (mcpServers format)
 */

const path = require('path');
const {
  readConfig,
  writeConfig,
  ensureDir,
  toCanonicalId,
  defToCanonical,
  canonicalToMcpServers,
  HOME,
} = require('./utils');

const CONFIG_PATH = path.join(HOME, '.gemini', 'settings.json');

function getPath() {
  return CONFIG_PATH;
}

function importConfig() {
  const data = readConfig(CONFIG_PATH);
  if (!data) throw new Error(`Config file not found: ${CONFIG_PATH}`);

  const servers = {};
  const mcpServers = data.mcpServers || {};
  for (const [name, def] of Object.entries(mcpServers)) {
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, def);
  }
  return servers;
}

function exportConfig(servers) {
  ensureDir(CONFIG_PATH);
  let existing = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch (_) {}

  const mcpData = canonicalToMcpServers(servers);
  const merged = {
    ...existing,
    mcpServers: { ...(existing.mcpServers || {}), ...mcpData.mcpServers },
  };
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

module.exports = {
  id: 'gemini-cli',
  name: 'Gemini CLI',
  getPath,
  importConfig,
  exportConfig,
};
