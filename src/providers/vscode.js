const path = require('path');
const {
  readConfig,
  writeConfig,
  toCanonicalId,
  defToCanonical,
  canonicalToVSCodeServers,
  HOME,
} = require('./utils');

function getPath() {
  const baseDir =
    process.platform === 'darwin'
      ? path.join(HOME, 'Library', 'Application Support', 'Code', 'User')
      : process.platform === 'win32'
        ? path.join(process.env.APPDATA || HOME, 'Code', 'User')
        : path.join(HOME, '.config', 'Code', 'User');
  return path.join(baseDir, 'mcp.json');
}

function importConfig() {
  const configPath = getPath();
  const data = readConfig(configPath);
  if (!data) throw new Error(`Config file not found: ${configPath}`);

  const servers = {};
  const vsServers = data.servers || {};
  for (const [name, def] of Object.entries(vsServers)) {
    const id = toCanonicalId(name);
    const type = def.type || (def.url ? 'http' : 'stdio');
    servers[id] = defToCanonical(name, { ...def, type });
  }
  return servers;
}

function exportConfig(servers) {
  const configPath = getPath();
  const data = canonicalToVSCodeServers(servers);
  let existing = { servers: {}, inputs: [] };
  try {
    const raw = readConfig(configPath);
    if (raw) existing = { servers: raw.servers || {}, inputs: raw.inputs || [] };
  } catch (_) {}
  const merged = { ...existing, servers: { ...existing.servers, ...data.servers } };
  writeConfig(configPath, merged);
  return { path: configPath, success: true };
}

module.exports = {
  id: 'vscode',
  name: 'VS Code',
  getPath,
  importConfig,
  exportConfig,
};
