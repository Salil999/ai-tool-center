import fs from 'fs';
import path from 'path';
import os from 'os';
import { isPathSafe } from '../providers/utils.js';
import { slugify } from '../utils/slugify.js';
import type { AppConfig, ProviderRule } from '../types.js';

function getRulesBase(): string {
  return process.env.AI_TOOL_CENTER_RULES_DIR || path.join(os.homedir(), '.ai_tool_center', 'rules');
}

/** Providers that support multiple rule files (directory of .md/.mdc) in the central store */
export const MULTI_FILE_RULE_PROVIDERS = ['cursor'] as const;

/** All provider rule types */
export const ALL_RULE_PROVIDERS = [...MULTI_FILE_RULE_PROVIDERS] as const;

export type MultiFileRuleProviderId = (typeof MULTI_FILE_RULE_PROVIDERS)[number];
export type RuleProviderId = (typeof ALL_RULE_PROVIDERS)[number];

// ── Direct-mode descriptor types ─────────────────────────────────────────────

/**
 * Direct single-file provider: reads/writes a single file at a fixed path.
 * No staging area or sync step needed.
 */
interface DirectSingleFileDescriptor {
  mode: 'single-file';
  filePath: string;
  extension: '.md';
}

/**
 * Direct multi-file provider: reads/writes files in a directory at a fixed path.
 * No staging area or sync step needed.
 */
interface DirectMultiFileDescriptor {
  mode: 'multi-file';
  dir: string;
  extension: '.md' | '.mdc';
}

type DirectDescriptor = DirectSingleFileDescriptor | DirectMultiFileDescriptor;

/**
 * Legacy single-file providers that live at a fixed path.
 * New providers use resolveDirectProvider instead.
 */
const SINGLE_FILE_RULE_PROVIDERS: Record<string, { filePath: string; displayName: string }> = {
  claude: { filePath: path.join(os.homedir(), '.claude', 'CLAUDE.md'), displayName: 'CLAUDE.md' },
};

// ── Path helpers ──────────────────────────────────────────────────────────────

function getProviderRulesDir(providerId: string): string {
  const base = getRulesBase();
  if (providerId.startsWith('custom-')) {
    return path.join(base, 'custom', providerId.replace('custom-', ''));
  }
  return path.join(base, providerId);
}

/**
 * Resolve a projectId to an absolute project path via config.projectDirectories.
 */
function resolveProjectPath(projectId: string, config?: AppConfig): string {
  const project = (config?.projectDirectories ?? []).find((pd) => pd.id === projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const expanded = project.path.startsWith('~')
    ? path.join(os.homedir(), project.path.slice(1))
    : project.path;
  return path.resolve(expanded);
}

/**
 * Resolve a providerId to a DirectDescriptor, or null for central-store providers.
 *
 * Static providers (no project context):
 *   claude         → ~/.claude/CLAUDE.md (single-file, existing)
 *   claude-local   → ~/.claude/CLAUDE.local.md (single-file)
 *   claude-rules   → ~/.claude/rules/ (multi-file .md)
 *   opencode-commands → ~/.config/opencode/commands/ (multi-file .md)
 *
 * Dynamic project-scoped providers (projectId resolved via config):
 *   claude-proj-local-{id}   → {project}/CLAUDE.local.md
 *   claude-proj-rules-{id}   → {project}/.claude/rules/
 *   claude-proj-{id}         → {project}/CLAUDE.md
 *   cursor-proj-{id}         → {project}/.cursor/rules/
 *   opencode-cmds-proj-{id}  → {project}/.opencode/commands/
 *
 * Note: prefixes are checked longest-first to prevent claude-proj- consuming claude-proj-local-.
 */
function resolveDirectProvider(providerId: string, config?: AppConfig): DirectDescriptor | null {
  const HOME = os.homedir();

  // Existing single-file providers (claude → ~/.claude/CLAUDE.md)
  if (providerId in SINGLE_FILE_RULE_PROVIDERS) {
    const { filePath } = SINGLE_FILE_RULE_PROVIDERS[providerId];
    return { mode: 'single-file', filePath, extension: '.md' };
  }

  // Static direct providers
  if (providerId === 'claude-local')
    return { mode: 'single-file', filePath: path.join(HOME, '.claude', 'CLAUDE.local.md'), extension: '.md' };

  if (providerId === 'claude-rules')
    return { mode: 'multi-file', dir: path.join(HOME, '.claude', 'rules'), extension: '.md' };

  if (providerId === 'opencode-commands')
    return { mode: 'multi-file', dir: path.join(HOME, '.config', 'opencode', 'commands'), extension: '.md' };

  // Dynamic project-scoped providers — longest prefix first to avoid early match
  if (providerId.startsWith('claude-proj-local-')) {
    const pp = resolveProjectPath(providerId.slice('claude-proj-local-'.length), config);
    return { mode: 'single-file', filePath: path.join(pp, 'CLAUDE.local.md'), extension: '.md' };
  }
  if (providerId.startsWith('claude-proj-rules-')) {
    const pp = resolveProjectPath(providerId.slice('claude-proj-rules-'.length), config);
    return { mode: 'multi-file', dir: path.join(pp, '.claude', 'rules'), extension: '.md' };
  }
  if (providerId.startsWith('claude-proj-')) {
    const pp = resolveProjectPath(providerId.slice('claude-proj-'.length), config);
    return { mode: 'single-file', filePath: path.join(pp, 'CLAUDE.md'), extension: '.md' };
  }
  if (providerId.startsWith('cursor-proj-')) {
    const pp = resolveProjectPath(providerId.slice('cursor-proj-'.length), config);
    return { mode: 'multi-file', dir: path.join(pp, '.cursor', 'rules'), extension: '.mdc' };
  }
  if (providerId.startsWith('opencode-cmds-proj-')) {
    const pp = resolveProjectPath(providerId.slice('opencode-cmds-proj-'.length), config);
    return { mode: 'multi-file', dir: path.join(pp, '.opencode', 'commands'), extension: '.md' };
  }

  return null; // central-store provider (cursor, custom-*)
}

/** Sanitize a ruleId to strip path traversal characters. */
function sanitizeRuleId(ruleId: string): string {
  return (ruleId || 'rule').replace(/\.\./g, '').replace(/[/\\]/g, '');
}

function getRuleExtension(providerId: string, config?: AppConfig): '.md' | '.mdc' {
  const desc = resolveDirectProvider(providerId, config);
  if (desc) return desc.extension;
  if (providerId.startsWith('custom-')) {
    const customId = providerId.replace('custom-', '');
    const custom = (config?.customRuleConfigs || []).find((c) => c.id === customId);
    return custom?.extension ?? '.md';
  }
  return providerId === 'cursor' ? '.mdc' : '.md';
}

function toFileId(name: string): string {
  return slugify(name, 'rule');
}

/**
 * Scan a directory for rule files with the given extension.
 */
function scanRuleDir(dir: string, ext: '.md' | '.mdc'): ProviderRule[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const rules: ProviderRule[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const base = path.basename(entry.name, ext);
    if (entry.name.endsWith(ext) && base) {
      rules.push({
        id: base,
        name: base.replace(/-/g, ' '),
        path: path.join(dir, entry.name),
        extension: ext,
      });
    }
  }
  return rules;
}

/**
 * Ensure the resolved file path stays under the base directory (prevents path traversal via ruleId).
 */
function ensurePathUnderDir(filePath: string, baseDir: string): void {
  const resolved = path.resolve(filePath);
  const baseResolved = path.resolve(baseDir);
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
    throw new Error('Path is not allowed');
  }
}

/**
 * List rule files for a provider from disk.
 * Dispatches to: direct-mode (single/multi-file), custom-*, or central-store (cursor).
 */
export function listProviderRules(providerId: string, config?: AppConfig): ProviderRule[] {
  // Direct-mode providers (single-file and multi-file)
  const desc = resolveDirectProvider(providerId, config);
  if (desc) {
    if (desc.mode === 'single-file') {
      if (!isPathSafe(desc.filePath)) return [];
      // Always return one entry so Edit button is visible even when file doesn't exist yet.
      return [{
        id: path.basename(desc.filePath, desc.extension),
        name: path.basename(desc.filePath),
        path: desc.filePath,
        extension: desc.extension,
      }];
    }
    // multi-file direct
    if (!isPathSafe(desc.dir)) return [];
    return scanRuleDir(desc.dir, desc.extension);
  }

  // Custom providers
  if (providerId.startsWith('custom-')) {
    const customId = providerId.replace('custom-', '');
    const custom = (config?.customRuleConfigs || []).find((c) => c.id === customId);
    if (!custom) return [];
    const dir = getProviderRulesDir(providerId);
    const ext = getRuleExtension(providerId, config);
    if (custom.type === 'file') {
      return [{
        id: path.basename(custom.path, ext) || 'rule',
        name: path.basename(custom.path) || 'rule',
        path: path.join(dir, path.basename(custom.path) || `rule${ext}`),
        extension: ext,
      }];
    }
    return scanRuleDir(dir, ext);
  }

  // Central-store providers (cursor)
  if (!MULTI_FILE_RULE_PROVIDERS.includes(providerId as MultiFileRuleProviderId)) {
    return [];
  }
  return scanRuleDir(getProviderRulesDir(providerId), getRuleExtension(providerId));
}

/**
 * Get ordered provider rules (from disk + config order).
 */
export function getOrderedProviderRules(
  providerId: string,
  config: AppConfig
): ProviderRule[] {
  const fromDisk = listProviderRules(providerId, config);
  const order = config.providerRuleOrder?.[providerId] ?? [];
  const orderedIds = order.filter((id) => fromDisk.some((r) => r.id === id));
  const extraIds = fromDisk.filter((r) => !orderedIds.includes(r.id)).map((r) => r.id);
  const ids = [...orderedIds, ...extraIds];
  const byId = new Map(fromDisk.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as ProviderRule[];
}

/**
 * Read rule file content.
 */
export function readProviderRuleContent(providerId: string, ruleId: string, config?: AppConfig): string {
  const desc = resolveDirectProvider(providerId, config);
  if (desc) {
    if (desc.mode === 'single-file') {
      if (!isPathSafe(desc.filePath)) throw new Error('Path is not allowed');
      return fs.existsSync(desc.filePath) ? fs.readFileSync(desc.filePath, 'utf8') : '';
    }
    // multi-file direct
    if (!isPathSafe(desc.dir)) throw new Error('Path is not allowed');
    const safeId = sanitizeRuleId(ruleId);
    if (!safeId) throw new Error(`Rule not found: ${ruleId}`);
    const filePath = path.join(desc.dir, `${safeId}${desc.extension}`);
    ensurePathUnderDir(filePath, desc.dir);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  }

  // Custom + central-store
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const safeId = sanitizeRuleId(ruleId);
  if (!safeId) throw new Error(`Rule not found: ${ruleId}`);
  const filePath = path.join(dir, `${safeId}${ext}`);
  if (!isPathSafe(filePath)) throw new Error('Path is not allowed');
  ensurePathUnderDir(filePath, dir);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

/**
 * Write rule file content.
 */
export function writeProviderRuleContent(
  providerId: string,
  ruleId: string,
  content: string,
  config?: AppConfig
): void {
  const desc = resolveDirectProvider(providerId, config);
  if (desc) {
    if (desc.mode === 'single-file') {
      if (!isPathSafe(desc.filePath)) throw new Error('Path is not allowed');
      fs.mkdirSync(path.dirname(desc.filePath), { recursive: true });
      fs.writeFileSync(desc.filePath, content, 'utf8');
      return;
    }
    // multi-file direct
    if (!isPathSafe(desc.dir)) throw new Error('Path is not allowed');
    const safeId = sanitizeRuleId(ruleId);
    if (!safeId) throw new Error('Invalid rule id');
    const filePath = path.join(desc.dir, `${safeId}${desc.extension}`);
    ensurePathUnderDir(filePath, desc.dir);
    fs.mkdirSync(desc.dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return;
  }

  // Custom + central-store
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const safeId = sanitizeRuleId(ruleId);
  if (!safeId) throw new Error('Invalid rule id');
  const filePath = path.join(dir, `${safeId}${ext}`);
  if (!isPathSafe(filePath)) throw new Error('Path is not allowed');
  ensurePathUnderDir(filePath, dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Create a new rule file. Only supported for multi-file providers.
 */
export function createProviderRule(
  providerId: string,
  name: string,
  content: string,
  config?: AppConfig
): ProviderRule {
  const desc = resolveDirectProvider(providerId, config);
  if (desc) {
    if (desc.mode === 'single-file') {
      throw new Error(`Provider ${providerId} does not support multiple rule files`);
    }
    // multi-file direct — write to the resolved directory
    const id = toFileId(name);
    const existing = scanRuleDir(desc.dir, desc.extension);
    let finalId = id;
    let n = 1;
    while (existing.some((r) => r.id === finalId)) {
      finalId = `${id}-${n++}`;
    }
    if (!isPathSafe(desc.dir)) throw new Error('Path is not allowed');
    const filePath = path.join(desc.dir, `${finalId}${desc.extension}`);
    ensurePathUnderDir(filePath, desc.dir);
    fs.mkdirSync(desc.dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return { id: finalId, name: finalId.replace(/-/g, ' '), path: filePath, extension: desc.extension };
  }

  // Custom + central-store
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  if (!MULTI_FILE_RULE_PROVIDERS.includes(providerId as MultiFileRuleProviderId) && !providerId.startsWith('custom-')) {
    throw new Error(`Provider ${providerId} does not support multiple rule files`);
  }
  const id = toFileId(name);
  const existing = listProviderRules(providerId, config);
  let finalId = id;
  let n = 1;
  while (existing.some((r) => r.id === finalId)) {
    finalId = `${id}-${n++}`;
  }
  const filePath = path.join(dir, `${finalId}${ext}`);
  if (!isPathSafe(filePath)) throw new Error('Path is not allowed');
  ensurePathUnderDir(filePath, dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { id: finalId, name: finalId.replace(/-/g, ' '), path: filePath, extension: ext };
}

/**
 * Delete a rule file. Only supported for multi-file providers.
 */
export function deleteProviderRule(providerId: string, ruleId: string, config?: AppConfig): void {
  const desc = resolveDirectProvider(providerId, config);
  if (desc) {
    if (desc.mode === 'single-file') {
      throw new Error(`Cannot delete a single-file provider rule`);
    }
    // multi-file direct
    const safeId = sanitizeRuleId(ruleId);
    if (!safeId) return;
    if (!isPathSafe(desc.dir)) throw new Error('Path is not allowed');
    const filePath = path.join(desc.dir, `${safeId}${desc.extension}`);
    ensurePathUnderDir(filePath, desc.dir);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  // Custom + central-store
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const safeId = sanitizeRuleId(ruleId);
  if (!safeId) return;
  const filePath = path.join(dir, `${safeId}${ext}`);
  if (!isPathSafe(filePath)) throw new Error('Path is not allowed');
  ensurePathUnderDir(filePath, dir);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/**
 * Copy ordered rules from the provider's rules dir to a target directory.
 * Only used for central-store providers (cursor, custom-*).
 */
function copyRulesToDir(
  providerId: string,
  targetDir: string,
  rules: ProviderRule[],
  ext: '.md' | '.mdc'
): number {
  fs.mkdirSync(targetDir, { recursive: true });
  let syncedCount = 0;
  for (const rule of rules) {
    const src = path.join(getProviderRulesDir(providerId), `${rule.id}${ext}`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(targetDir, `${rule.id}${ext}`));
      syncedCount++;
    }
  }
  return syncedCount;
}

/**
 * Sync central-store provider rules to a target path (e.g. ~/.cursor/rules).
 * Only applicable to central-store providers (cursor, custom-*).
 */
export function syncProviderRulesToTarget(
  providerId: string,
  targetPath: string,
  config: AppConfig
): { path: string; syncedCount: number } {
  if (!isPathSafe(targetPath)) {
    throw new Error('Target path is not allowed');
  }

  const rules = getOrderedProviderRules(providerId, config);
  const ext = getRuleExtension(providerId, config);

  // Custom file-type provider: copy single rule as the target file
  if (providerId.startsWith('custom-')) {
    const customId = providerId.replace('custom-', '');
    const custom = (config?.customRuleConfigs || []).find((c) => c.id === customId);
    if (!custom) return { path: targetPath, syncedCount: 0 };
    if (custom.type === 'file') {
      const src = rules[0]
        ? path.join(getProviderRulesDir(providerId), `${rules[0].id}${ext}`)
        : path.join(getProviderRulesDir(providerId), `rule${ext}`);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(src, targetPath);
        return { path: targetPath, syncedCount: 1 };
      }
      return { path: targetPath, syncedCount: 0 };
    }
  }

  // Directory-based: copy all rule files
  const syncedCount = copyRulesToDir(providerId, targetPath, rules, ext);
  return { path: targetPath, syncedCount };
}
