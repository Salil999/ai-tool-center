/**
 * Windsurf (Codeium) provider - https://docs.codeium.com/windsurf/mcp
 * Config: ~/.codeium/windsurf/mcp_config.json (mcpServers format, same as Claude)
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

function getPath() {
  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE || HOME, '.codeium', 'windsurf', 'mcp_config.json');
  }
  return path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
}

function importConfig() {
  const configPath = getPath();
  const data = readConfig(configPath);
  if (!data) throw new Error(`Config file not found: ${configPath}`);

  const servers = {};
  const mcpServers = data.mcpServers || {};
  for (const [name, def] of Object.entries(mcpServers)) {
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, def);
  }
  return servers;
}

function exportConfig(servers) {
  const configPath = getPath();
  const data = canonicalToMcpServers(servers);
  ensureDir(configPath);
  let existing = {};
  try {
    const raw = readConfig(configPath);
    if (raw) existing = raw;
  } catch (_) {}
  const merged = { ...existing, ...data };
  writeConfig(configPath, merged);
  return { path: configPath, success: true };
}

module.exports = {
  id: 'windsurf',
  name: 'Windsurf',
  getPath,
  importConfig,
  exportConfig,
};
