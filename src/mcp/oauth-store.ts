/**
 * OAuth state and token persistence for MCP servers.
 * Stores per-server OAuth state (client info, tokens, code verifier, discovery metadata)
 * and in-memory pending auth state for the callback flow.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getConfigPath } from '../config/loader.js';

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingAuth = new Map<string, { serverId: string; serverUrl: string; createdAt: number }>();

export function getOAuthDir(): string {
  const configPath = getConfigPath();
  return path.dirname(configPath);
}

export function getOAuthStatePath(serverId: string): string {
  const dir = getOAuthDir();
  const safeId = serverId.replace(/[^a-z0-9-]/gi, '_');
  return path.join(dir, `oauth-${safeId}.json`);
}

export function setPendingAuth(state: string, { serverId, serverUrl }: { serverId: string; serverUrl: string }): void {
  pendingAuth.set(state, {
    serverId,
    serverUrl,
    createdAt: Date.now(),
  });
}

export function getPendingAuth(state: string): { serverId: string; serverUrl: string } | null {
  const entry = pendingAuth.get(state);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PENDING_AUTH_TTL_MS) {
    pendingAuth.delete(state);
    return null;
  }
  pendingAuth.delete(state);
  return entry;
}

export function getServerOAuthState(serverId: string): Record<string, unknown> | null {
  const filePath = getOAuthStatePath(serverId);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function saveServerOAuthState(serverId: string, state: Record<string, unknown>): void {
  const dir = getOAuthDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getOAuthStatePath(serverId);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

export function generateState(serverId: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  return `${nonce}:${serverId}`;
}

export function parseState(stateStr: string): { nonce: string; serverId: string } | null {
  if (!stateStr || typeof stateStr !== 'string') return null;
  const idx = stateStr.indexOf(':');
  if (idx === -1) return null;
  return {
    nonce: stateStr.slice(0, idx),
    serverId: stateStr.slice(idx + 1),
  };
}
