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

const CONFIG_PATH = path.join(HOME, '.cursor', 'mcp.json');

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
  const data = canonicalToMcpServers(servers);
  ensureDir(CONFIG_PATH);
  let existing = {};
  try {
    const raw = readConfig(CONFIG_PATH);
    if (raw) existing = raw;
  } catch (_) {}
  const merged = { ...existing, ...data };
  writeConfig(CONFIG_PATH, merged);
  return { path: CONFIG_PATH, success: true };
}

module.exports = {
  id: 'cursor',
  name: 'Cursor',
  getPath,
  importConfig,
  exportConfig,
};
