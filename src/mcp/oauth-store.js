/**
 * OAuth state and token persistence for MCP servers.
 * Stores per-server OAuth state (client info, tokens, code verifier, discovery metadata)
 * and in-memory pending auth state for the callback flow.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getConfigPath } = require('../config/loader');

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingAuth = new Map(); // state -> { serverId, serverUrl, createdAt }

function getOAuthDir() {
  const configPath = getConfigPath();
  return path.dirname(configPath);
}

function getOAuthStatePath(serverId) {
  const dir = getOAuthDir();
  const safeId = serverId.replace(/[^a-z0-9-]/gi, '_');
  return path.join(dir, `oauth-${safeId}.json`);
}

function setPendingAuth(state, { serverId, serverUrl }) {
  pendingAuth.set(state, {
    serverId,
    serverUrl,
    createdAt: Date.now(),
  });
}

function getPendingAuth(state) {
  const entry = pendingAuth.get(state);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PENDING_AUTH_TTL_MS) {
    pendingAuth.delete(state);
    return null;
  }
  pendingAuth.delete(state);
  return entry;
}

function getServerOAuthState(serverId) {
  const filePath = getOAuthStatePath(serverId);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveServerOAuthState(serverId, state) {
  const dir = getOAuthDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getOAuthStatePath(serverId);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

function generateState(serverId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return `${nonce}:${serverId}`;
}

function parseState(stateStr) {
  if (!stateStr || typeof stateStr !== 'string') return null;
  const idx = stateStr.indexOf(':');
  if (idx === -1) return null;
  return {
    nonce: stateStr.slice(0, idx),
    serverId: stateStr.slice(idx + 1),
  };
}

module.exports = {
  getOAuthDir,
  getOAuthStatePath,
  setPendingAuth,
  getPendingAuth,
  getServerOAuthState,
  saveServerOAuthState,
  generateState,
  parseState,
};
