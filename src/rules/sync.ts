import fs from 'fs';
import path from 'path';
import os from 'os';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import { RULES_PROVIDERS, getRuleProviderPath } from './providers.js';
import type { AppConfig } from '../types.js';

const AGENTS_BASE =
  process.env.AI_TOOL_CENTER_AGENTS_DIR || path.join(os.homedir(), '.ai_tool_center', 'agents');

/**
 * Get path to AGENTS.md for an agent rule (stored in ~/.ai_tool_center/agents/{id}/).
 */
export function getAgentsPathForAgent(agentId: string): string {
  return path.join(AGENTS_BASE, agentId, 'AGENTS.md');
}

/**
 * Read AGENTS.md content for an agent rule from central store.
 */
export function readAgentsForAgent(agentId: string): string {
  const filePath = getAgentsPathForAgent(agentId);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Write AGENTS.md content for an agent rule to central store.
 */
export function writeAgentsForAgent(agentId: string, content: string): void {
  const filePath = getAgentsPathForAgent(agentId);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Sync AGENTS.md from agent store to a project path.
 */
export function syncAgentsToProject(agentId: string, projectPath: string): { path: string; success: boolean } {
  const content = readAgentsForAgent(agentId);
  const resolved = resolvePath(projectPath);
  const writePath = path.join(resolved, 'AGENTS.md');
  if (!isPathSafe(writePath)) {
    throw new Error('Project path is not allowed');
  }
  const dir = path.dirname(writePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(writePath, content, 'utf8');
  return { path: writePath, success: true };
}

/**
 * Sync AGENTS.md from agent store to a provider target (claude, opencode).
 */
export function syncAgentsFromAgentToProvider(
  agentId: string,
  targetId: string
): { path: string; success: boolean } {
  const content = readAgentsForAgent(agentId);
  const target = getRuleProviderPath(targetId);
  if (!target) {
    throw new Error(`Unknown rules provider: ${targetId}`);
  }

  const resolved = path.resolve(target.path);
  if (!isPathSafe(resolved)) {
    throw new Error('Provider path is not allowed');
  }

  let writePath: string;
  if (target.type === 'file') {
    writePath = resolved;
  } else {
    fs.mkdirSync(resolved, { recursive: true });
    writePath = path.join(resolved, 'AGENTS.md');
  }

  fs.writeFileSync(writePath, content, 'utf8');
  return { path: writePath, success: true };
}

/**
 * Copy AGENTS.md from one agent to another agent's project path (or same agent to different path).
 */
export function copyAgentsBetweenAgents(
  sourceAgentId: string,
  targetProjectPath: string
): { path: string; success: boolean } {
  return syncAgentsToProject(sourceAgentId, targetProjectPath);
}

/** @deprecated Use readAgentsForAgent + agent store. Kept for import from disk. */
export function readAgentsForProject(projectPath: string): string {
  const filePath = path.join(resolvePath(projectPath), 'AGENTS.md');
  if (!isPathSafe(filePath)) {
    throw new Error('Project path is not allowed');
  }
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

/** @deprecated Use writeAgentsForAgent. Kept for import to agent store. */
export function writeAgentsForProject(projectPath: string, content: string): void {
  const filePath = path.join(resolvePath(projectPath), 'AGENTS.md');
  if (!isPathSafe(filePath)) {
    throw new Error('Project path is not allowed');
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

export { RULES_PROVIDERS };
