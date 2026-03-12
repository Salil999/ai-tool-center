const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();

function isPathSafe(targetPath) {
  const resolved = path.resolve(targetPath);
  const homeResolved = path.resolve(HOME);
  return resolved.startsWith(homeResolved) || resolved.startsWith(path.resolve(process.cwd()));
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readConfig(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeConfig(filePath, data) {
  if (!isPathSafe(filePath)) {
    throw new Error('Path is outside allowed directories');
  }
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function expandPath(p) {
  if (typeof p !== 'string') return p;
  if (p.startsWith('~/') || p === '~') {
    return path.join(HOME, p.slice(1));
  }
  return p;
}

function resolvePath(filePath) {
  return path.resolve(expandPath(filePath));
}

/**
 * Convert display name to canonical id (lowercase, hyphenated).
 */
function toCanonicalId(name) {
  return (name || 'server').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'server';
}

/**
 * Parse provider format to canonical: { id -> { name, enabled, type, command?, args?, env?, url? } }
 */
function defToCanonical(name, def) {
  const type = def.url ? 'http' : (def.type || 'stdio');
  return {
    name,
    enabled: true,
    type,
    command: def.command,
    args: def.args || [],
    env: def.env || {},
    url: def.url,
    headers: def.headers && typeof def.headers === 'object' ? def.headers : undefined,
  };
}

/**
 * Canonical server to mcpServers format (Cursor/Claude).
 */
function canonicalToMcpServers(servers) {
  const mcpServers = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;
    if (s.url) {
      mcpServers[name] = { url: s.url, ...(s.headers && { headers: s.headers }) };
    } else if (s.type === 'stdio' && s.command) {
      mcpServers[name] = {
        command: s.command,
        ...(s.args?.length && { args: s.args }),
        ...(s.env && Object.keys(s.env).length && { env: s.env }),
      };
    }
  }
  return { mcpServers };
}

/**
 * Canonical server to VS Code servers format.
 */
function canonicalToVSCodeServers(servers) {
  const vsServers = {};
  for (const [id, s] of Object.entries(servers)) {
    if (!s.enabled) continue;
    const name = s.name || id;
    if (s.url) {
      vsServers[name] = { type: 'http', url: s.url, ...(s.headers && { headers: s.headers }) };
    } else if (s.type === 'stdio' && s.command) {
      vsServers[name] = {
        type: 'stdio',
        command: s.command,
        ...(s.args?.length && { args: s.args }),
        ...(s.env && Object.keys(s.env).length && { env: s.env }),
      };
    } else if (s.type === 'sse' && s.url) {
      vsServers[name] = { type: 'sse', url: s.url, ...(s.headers && { headers: s.headers }) };
    }
  }
  return { servers: vsServers };
}

/**
 * Normalize server for duplicate comparison (url or command + args).
 */
function serverSignature(server) {
  if (server.url) {
    try {
      const u = new URL(server.url);
      return `url:${u.origin}${u.pathname}`;
    } catch {
      return `url:${String(server.url)}`;
    }
  }
  if (server.command) {
    const args = (server.args || []).join(' ');
    return `stdio:${String(server.command).trim()} ${args}`.trim();
  }
  return null;
}

/**
 * Check if a server is a duplicate of any existing server (same url or command).
 */
function isDuplicate(server, existing) {
  const sig = serverSignature(server);
  if (!sig) return false;
  for (const s of Object.values(existing)) {
    if (serverSignature(s) === sig) return true;
  }
  return false;
}

/**
 * Merge imported servers into existing, avoiding id collisions and skipping duplicates.
 * A server is considered a duplicate if it has the same url (for HTTP) or command+args (for stdio).
 */
function mergeServers(existing, imported) {
  const merged = { ...existing };
  let suffix = 1;
  for (const [id, server] of Object.entries(imported)) {
    if (isDuplicate(server, merged)) continue;
    let finalId = id;
    while (merged[finalId]) {
      finalId = `${id}-${suffix++}`;
    }
    merged[finalId] = server;
  }
  return merged;
}

module.exports = {
  HOME,
  isPathSafe,
  ensureDir,
  readConfig,
  writeConfig,
  expandPath,
  resolvePath,
  toCanonicalId,
  defToCanonical,
  canonicalToMcpServers,
  canonicalToVSCodeServers,
  serverSignature,
  isDuplicate,
  mergeServers,
};
