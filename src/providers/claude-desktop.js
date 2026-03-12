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
  const baseDir =
    process.platform === 'darwin'
      ? path.join(HOME, 'Library', 'Application Support', 'Claude')
      : process.platform === 'win32'
        ? path.join(process.env.APPDATA || HOME, 'Claude')
        : path.join(HOME, '.config', 'Claude');
  return path.join(baseDir, 'claude_desktop_config.json');
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
  id: 'claude_desktop',
  name: 'Claude Desktop',
  getPath,
  importConfig,
  exportConfig,
};
