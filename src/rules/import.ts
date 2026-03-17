import fs from 'fs';
import path from 'path';
import os from 'os';
import { RULES_PROVIDERS, getRuleProviderPath } from './providers.js';
import { readAgentsForAgent, writeAgentsForAgent } from './sync.js';
import { isPathSafe } from '../providers/utils.js';
import type { AppConfig, RuleImportSource, ProjectRuleSource, RuleImportSourcesResponse, AgentImportSourcesResponse } from '../types.js';

export type { RuleImportSource, ProjectRuleSource, RuleImportSourcesResponse, AgentImportSourcesResponse };

/** Rules-only: Cursor. AGENTS.md is separate. */
export const PROJECT_RULE_SUBDIRS = [
  { key: 'cursor', subdir: '.cursor/rules', label: 'Cursor', importToProvider: true },
] as const;

/** AGENTS.md-only sources (project AGENTS.md, .claude/rules). */
export const PROJECT_AGENT_SUBDIRS = [
  { key: 'claude', subdir: '.claude/rules', label: 'Claude Code (.claude/rules)' },
] as const;

/**
 * Resolve path to an AGENTS.md or CLAUDE.md file.
 * If the path is a directory, looks for AGENTS.md or CLAUDE.md inside it.
 */
function resolveRulesFilePath(filePath: string): string | null {
  const resolved = path.resolve(filePath);
  if (!isPathSafe(resolved) || !fs.existsSync(resolved)) {
    return null;
  }
  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    return resolved;
  }
  if (stat.isDirectory()) {
    const agentsPath = path.join(resolved, 'AGENTS.md');
    const claudePath = path.join(resolved, 'CLAUDE.md');
    if (fs.existsSync(agentsPath) && fs.statSync(agentsPath).isFile()) {
      return agentsPath;
    }
    if (fs.existsSync(claudePath) && fs.statSync(claudePath).isFile()) {
      return claudePath;
    }
    return null;
  }
  return null;
}

/**
 * Read rules content from a file path.
 * Accepts either a file path or a directory path (looks for AGENTS.md or CLAUDE.md).
 */
function readRulesFromFile(filePath: string): string {
  const resolved = resolveRulesFilePath(filePath);
  if (!resolved) return '';
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

/** Provider IDs that are rules-only (not AGENTS.md). */
const RULES_ONLY_PROVIDER_IDS = ['cursor'];

/**
 * Discover rule import sources: rules-only providers and project rules. AGENTS.md is separate.
 */
export function discoverRuleSources(config: AppConfig): RuleImportSourcesResponse {
  const providers: RuleImportSource[] = [];

  for (const provider of RULES_PROVIDERS) {
    if (!RULES_ONLY_PROVIDER_IDS.includes(provider.id)) continue;
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

    providers.push({
      id: provider.id,
      name: provider.name,
      path: provider.path,
      exists,
      hasContent,
      error: error || undefined,
    });
  }

  const projects: ProjectRuleSource[] = [];

  for (const project of config.projectDirectories || []) {
    const projectPath = path.resolve(project.path);
    const sources: RuleImportSource[] = [];

    for (const { key, subdir, label } of PROJECT_RULE_SUBDIRS) {
      const isFile = subdir.endsWith('.md');
      const fullPath = path.join(projectPath, ...subdir.split('/'));
      let exists = false;
      let hasContent = false;
      let error: string | null = null;

      try {
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (isFile && stat.isFile()) {
            exists = true;
            hasContent = fs.readFileSync(fullPath, 'utf8').trim().length > 0;
          } else if (!isFile && stat.isDirectory()) {
            exists = true;
            const content = readRulesFromDirectory(fullPath);
            hasContent = content.trim().length > 0;
          }
        }
      } catch (err) {
        error = (err as Error).message;
      }

      sources.push({
        id: `project-${project.id}__${key}`,
        name: label,
        path: fullPath,
        exists,
        hasContent,
        error: error || undefined,
      });
    }

    projects.push({
      id: project.id,
      name: project.name || project.path,
      path: projectPath,
      sources,
    });
  }

  return { providers, projects };
}

/**
 * Resolve project rule source ID to full path and metadata.
 */
export function resolveProjectRuleSource(
  sourceId: string,
  projectDirectories: Array<{ id: string; path: string }>
): { path: string; importToProvider: boolean; providerId?: string } | null {
  const match = sourceId.match(/^project-(.+)__cursor$/);
  if (!match) return null;
  const [, projectId] = match;
  const key = 'cursor';
  const project = projectDirectories.find((pd) => pd.id === projectId);
  if (!project) return null;
  const entry = PROJECT_RULE_SUBDIRS.find((e) => e.key === key);
  if (!entry) return null;
  const fullPath = path.join(path.resolve(project.path), ...entry.subdir.split('/'));
  if (entry.importToProvider) {
    return { path: fullPath, importToProvider: true, providerId: key };
  }
  return { path: fullPath, importToProvider: false };
}

/** Resolve project agent source (AGENTS.md, .claude/rules) to path. */
export function resolveProjectAgentSource(
  sourceId: string,
  projectDirectories: Array<{ id: string; path: string }>
): { path: string; key: 'agents' | 'claude' } | null {
  const match = sourceId.match(/^project-(.+)__claude$/);
  if (!match) return null;
  const [, projectId] = match;
  const key = 'claude';
  const project = projectDirectories.find((pd) => pd.id === projectId);
  if (!project) return null;
  const entry = PROJECT_AGENT_SUBDIRS.find((e) => e.key === key);
  if (!entry) return null;
  const fullPath = path.join(path.resolve(project.path), ...entry.subdir.split('/'));
  return { path: fullPath, key: 'claude' };
}

/**
 * Discover AGENTS.md import sources: project AGENTS.md/.claude/rules + agent entries.
 */
export function discoverAgentSources(config: AppConfig): AgentImportSourcesResponse {
  const projects: ProjectRuleSource[] = [];

  for (const project of config.projectDirectories || []) {
    const projectPath = path.resolve(project.path);
    const sources: RuleImportSource[] = [];

    for (const { key, subdir, label } of PROJECT_AGENT_SUBDIRS) {
      const isFile = subdir.endsWith('.md');
      const fullPath = path.join(projectPath, ...subdir.split('/'));
      let exists = false;
      let hasContent = false;
      let error: string | null = null;

      try {
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (isFile && stat.isFile()) {
            exists = true;
            hasContent = fs.readFileSync(fullPath, 'utf8').trim().length > 0;
          } else if (!isFile && stat.isDirectory()) {
            exists = true;
            const content = readRulesFromDirectory(fullPath);
            hasContent = content.trim().length > 0;
          }
        }
      } catch (err) {
        error = (err as Error).message;
      }

      sources.push({
        id: `project-${project.id}__${key}`,
        name: label,
        path: fullPath,
        exists,
        hasContent,
        error: error || undefined,
      });
    }

    projects.push({
      id: project.id,
      name: project.name || project.path,
      path: projectPath,
      sources,
    });
  }

  const agents: RuleImportSource[] = [];

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

    agents.push({
      id: `agent-${agent.id}`,
      name: agent.name || agent.projectPath,
      path: sourcePath,
      exists,
      hasContent,
      error: error || undefined,
    });
  }

  return { projects, agents };
}

/**
 * Import rules from a project's AGENTS.md or .claude/rules into a target agent's AGENTS.md.
 */
export function importFromProjectSourceToAgent(
  sourcePath: string,
  targetAgentId: string,
  key: 'agents' | 'claude'
): { success: boolean } {
  const resolved = path.resolve(sourcePath);
  if (!isPathSafe(resolved)) {
    throw new Error('Path is not allowed');
  }

  let content: string;
  if (key === 'agents') {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error(`File not found: ${resolved}`);
    }
    content = fs.readFileSync(resolved, 'utf8');
  } else {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error(`Directory not found: ${resolved}`);
    }
    content = readRulesFromDirectory(resolved);
  }

  if (!content.trim()) {
    throw new Error('Source has no content');
  }

  writeAgentsForAgent(targetAgentId, content);
  return { success: true };
}

/**
 * Import rules from a source into a target agent's AGENTS.md (stored in ~/.ai_tool_center).
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
 * Get project directory from a custom path (file or directory containing AGENTS.md/CLAUDE.md).
 */
export function getProjectPathFromCustomPath(filePath: string): string | null {
  const resolved = resolveRulesFilePath(filePath);
  return resolved ? path.dirname(resolved) : null;
}

/**
 * Import rules from a custom file path into a target agent's AGENTS.md.
 * Accepts a file path (AGENTS.md or CLAUDE.md) or a directory path (looks for AGENTS.md or CLAUDE.md inside).
 */
export function importFromCustomPath(filePath: string, targetAgentId: string): { success: boolean } {
  const resolved = resolveRulesFilePath(filePath);
  if (!resolved) {
    throw new Error(
      'No AGENTS.md or CLAUDE.md found at that path. Enter a file path (e.g. ~/my-project/AGENTS.md) or a directory that contains AGENTS.md or CLAUDE.md.'
    );
  }
  const content = fs.readFileSync(resolved, 'utf8');
  if (!content.trim()) {
    throw new Error(`File is empty: ${resolved}`);
  }
  writeAgentsForAgent(targetAgentId, content);
  return { success: true };
}

/** Provider IDs that support importing into the app's Rules section. */
const PROVIDER_RULES_IMPORT_IDS = ['cursor'] as const;

/**
 * Import rules from a project's provider directory (e.g. project/.cursor/rules) into the app's Rules section.
 */
export function importFromProjectSourceToProvider(
  sourcePath: string,
  providerId: string,
  config: AppConfig
): { success: boolean; importedCount: number } {
  const rulesBase = process.env.AI_TOOL_CENTER_RULES_DIR || path.join(os.homedir(), '.ai_tool_center', 'rules');
  const destDir = path.join(rulesBase, providerId);
  const ext = providerId === 'cursor' ? '.mdc' : '.md';
  const srcResolved = path.resolve(sourcePath);

  if (!isPathSafe(srcResolved) || !isPathSafe(destDir)) {
    throw new Error('Path is not allowed');
  }

  fs.mkdirSync(destDir, { recursive: true });
  let importedCount = 0;

  if (!fs.existsSync(srcResolved) || !fs.statSync(srcResolved).isDirectory()) {
    throw new Error(`Source directory not found: ${srcResolved}`);
  }

  const entries = fs.readdirSync(srcResolved, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(ext)) continue;
    const base = path.basename(entry.name, ext);
    if (!base) continue;

    const srcPath = path.join(srcResolved, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (!isPathSafe(srcPath) || !isPathSafe(destPath)) continue;

    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    importedCount++;
  }

  return { success: true, importedCount };
}

/**
 * Import rules from a provider's directory (e.g. ~/.cursor/rules) into the app's Rules section
 * (~/.ai_tool_center/rules/{providerId}). Use when the user has rules in Cursor
 * and wants to bring them into the app for central management.
 */
export function importFromProviderToRules(
  providerId: string,
  config: AppConfig
): { success: boolean; importedCount: number } {
  if (!PROVIDER_RULES_IMPORT_IDS.includes(providerId as (typeof PROVIDER_RULES_IMPORT_IDS)[number])) {
    throw new Error(`Cannot import to provider rules: ${providerId}. Supported: cursor.`);
  }

  const provider = getRuleProviderPath(providerId);
  if (!provider || provider.type !== 'directory') {
    throw new Error(`Provider ${providerId} is not a directory-based rules source`);
  }

  const rulesBase = process.env.AI_TOOL_CENTER_RULES_DIR || path.join(os.homedir(), '.ai_tool_center', 'rules');
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
