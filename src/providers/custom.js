const {
  readConfig,
  writeConfig,
  isPathSafe,
  resolvePath,
  toCanonicalId,
  defToCanonical,
  canonicalToMcpServers,
} = require('./utils');

function importConfig(filePath, configKey = 'mcpServers') {
  const resolved = resolvePath(filePath);
  if (!isPathSafe(resolved)) throw new Error('Path is not allowed');

  const data = readConfig(resolved);
  if (!data) throw new Error(`File not found: ${resolved}`);

  const serversRaw = data[configKey];
  if (!serversRaw || typeof serversRaw !== 'object') {
    throw new Error(`No "${configKey}" key found in file`);
  }

  const servers = {};
  for (const [name, def] of Object.entries(serversRaw)) {
    const id = toCanonicalId(name);
    servers[id] = defToCanonical(name, def);
  }
  return servers;
}

function exportConfig(servers, filePath, configKey = 'mcpServers') {
  const resolved = resolvePath(filePath);
  if (!filePath || !isPathSafe(resolved)) {
    throw new Error('Invalid or unsafe custom path');
  }

  const data = canonicalToMcpServers(servers);
  let existing = {};
  try {
    const raw = readConfig(resolved);
    if (raw) existing = raw;
  } catch (_) {}
  const merged = { ...existing, [configKey]: data.mcpServers };
  writeConfig(resolved, merged);
  return { path: resolved, success: true };
}

module.exports = {
  id: 'custom',
  name: 'Custom',
  importConfig,
  exportConfig,
};
