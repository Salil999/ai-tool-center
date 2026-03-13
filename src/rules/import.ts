import fs from 'fs';
import path from 'path';
import os from 'os';
import { RULES_PROVIDERS, getRuleProviderPath } from './providers.js';
import { readAgentsForAgent, writeAgentsForAgent } from './sync.js';
import { isPathSafe } from '../providers/utils.js';
import type { AppConfig } from '../types.js';

export interface RuleImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  hasContent: boolean;
  error?: string;
}

/**
 * Read rules content from a file path.
 */
function readRulesFromFile(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!isPathSafe(resolved) || !fs.existsSync(resolved)) {
    return '';
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) return '';
  return fs.readFileSync(resolved, 'utf8');
}

/**
 * Read rules content from a directory (concatenate .md and .mdc files).
 */
function readRulesFromDirectory(dirPath: string): string {
  const resolved = path.resolve(dirPath);
  if (!isPathSafe(resolved) || !fs.existsSync(resolved)) {
    return '';
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) return '';

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.md' || ext === '.mdc') {
      files.push(entry.name);
    }
  }
  files.sort();

  const parts: string[] = [];
  for (const name of files) {
    const fullPath = path.join(resolved, name);
    parts.push(fs.readFileSync(fullPath, 'utf8'));
  }
  return parts.join('\n\n---\n\n');
}

/**
 * Discover rule import sources: provider paths + project paths.
 */
export function discoverRuleSources(config: AppConfig): RuleImportSource[] {
  const result: RuleImportSource[] = [];

  for (const provider of RULES_PROVIDERS) {
    let exists = false;
    let hasContent = false;
    let error: string | null = null;

    try {
      const providerPath = provider.path;
      if (provider.type === 'file') {
        exists = fs.existsSync(providerPath);
        hasContent = exists && fs.readFileSync(providerPath, 'utf8').trim().length > 0;
      } else {
        exists = fs.existsSync(providerPath) && fs.statSync(providerPath).isDirectory();
        if (exists) {
          const content = readRulesFromDirectory(providerPath);
          hasContent = content.trim().length > 0;
        }
      }
    } catch (err) {
      error = (err as Error).message;
    }

    result.push({
      id: provider.id,
      name: provider.name,
      path: provider.path,
      exists,
      hasContent,
      error: error || undefined,
    });
  }

  for (const agent of config.agentRules || []) {
    const agentsPath = path.join(agent.projectPath, 'AGENTS.md');
    const claudePath = path.join(agent.projectPath, 'CLAUDE.md');
    let exists = false;
    let hasContent = false;
    let sourcePath = agentsPath;
    let error: string | null = null;

    try {
      const storeContent = readAgentsForAgent(agent.id);
      if (storeContent.trim().length > 0) {
        exists = true;
        hasContent = true;
        sourcePath = agentsPath;
      } else if (fs.existsSync(agentsPath)) {
        exists = true;
        sourcePath = agentsPath;
        hasContent = fs.readFileSync(agentsPath, 'utf8').trim().length > 0;
      } else if (fs.existsSync(claudePath)) {
        exists = true;
        sourcePath = claudePath;
        hasContent = fs.readFileSync(claudePath, 'utf8').trim().length > 0;
      }
    } catch (err) {
      error = (err as Error).message;
    }

    result.push({
      id: `agent-${agent.id}`,
      name: agent.name || agent.projectPath,
      path: sourcePath,
      exists,
      hasContent,
      error: error || undefined,
    });
  }

  return result;
}

/**
 * Import rules from a source into a target agent's AGENTS.md (stored in ~/.ai_tools_manager).
 */
export function importFromRuleSource(
  sourceId: string,
  targetAgentId: string,
  config: AppConfig
): { success: boolean } {
  const provider = getRuleProviderPath(sourceId);
  let content: string;

  if (provider) {
    if (provider.type === 'file') {
      content = readRulesFromFile(provider.path);
    } else {
      content = readRulesFromDirectory(provider.path);
    }
  } else if (sourceId.startsWith('agent-')) {
    const agentId = sourceId.replace('agent-', '');
    const agent = (config.agentRules || []).find((a) => a.id === agentId);
    if (!agent) throw new Error('Agent rule not found');
    const storeContent = readAgentsForAgent(agentId);
    if (storeContent.trim().length > 0) {
      content = storeContent;
    } else {
      const agentsPath = path.join(agent.projectPath, 'AGENTS.md');
      const claudePath = path.join(agent.projectPath, 'CLAUDE.md');
      if (fs.existsSync(agentsPath)) {
        content = readRulesFromFile(agentsPath);
      } else if (fs.existsSync(claudePath)) {
        content = readRulesFromFile(claudePath);
      } else {
        throw new Error('No AGENTS.md or CLAUDE.md found at project path');
      }
    }
  } else {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  writeAgentsForAgent(targetAgentId, content);
  return { success: true };
}

/**
 * Import rules from a custom file path into a target agent's AGENTS.md.
 */
export function importFromCustomPath(filePath: string, targetAgentId: string): { success: boolean } {
  const content = readRulesFromFile(filePath);
  writeAgentsForAgent(targetAgentId, content);
  return { success: true };
}

/** Provider IDs that support importing into the app's Rules section (multi-file providers). */
const PROVIDER_RULES_IMPORT_IDS = ['cursor', 'augment'] as const;

/**
 * Import rules from a provider's directory (e.g. ~/.cursor/rules) into the app's Rules section
 * (~/.ai_tools_manager/rules/{providerId}). Use when the user has rules in Cursor or Augment
 * and wants to bring them into the app for central management.
 */
export function importFromProviderToRules(
  providerId: string,
  config: AppConfig
): { success: boolean; importedCount: number } {
  if (!PROVIDER_RULES_IMPORT_IDS.includes(providerId as (typeof PROVIDER_RULES_IMPORT_IDS)[number])) {
    throw new Error(`Cannot import to provider rules: ${providerId}. Supported: cursor, augment.`);
  }

  const provider = getRuleProviderPath(providerId);
  if (!provider || provider.type !== 'directory') {
    throw new Error(`Provider ${providerId} is not a directory-based rules source`);
  }

  const rulesBase = process.env.AI_TOOLS_MANAGER_RULES_DIR || path.join(os.homedir(), '.ai_tools_manager', 'rules');
  const destDir = path.join(rulesBase, providerId);
  const ext = providerId === 'cursor' ? '.mdc' : '.md';
  const srcDir = path.resolve(provider.path);

  if (!isPathSafe(srcDir) || !isPathSafe(destDir)) {
    throw new Error('Path is not allowed');
  }
  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let importedCount = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(ext)) continue;
    const base = path.basename(entry.name, ext);
    if (!base) continue;

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (!isPathSafe(srcPath) || !isPathSafe(destPath)) continue;

    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    importedCount++;
  }

  return { success: true, importedCount };
}
