import fs from 'fs';
import path from 'path';
import os from 'os';
import { isPathSafe } from '../providers/utils.js';
import { slugify } from '../utils/slugify.js';
import type { AppConfig, ProviderRule } from '../types.js';

function getRulesBase(): string {
  return process.env.AI_TOOL_CENTER_RULES_DIR || path.join(os.homedir(), '.ai_tool_center', 'rules');
}

/** Providers that support multiple rule files (directory of .md/.mdc) */
export const MULTI_FILE_RULE_PROVIDERS = ['cursor'] as const;

/** All provider rule types */
export const ALL_RULE_PROVIDERS = [...MULTI_FILE_RULE_PROVIDERS] as const;

export type MultiFileRuleProviderId = (typeof MULTI_FILE_RULE_PROVIDERS)[number];
export type RuleProviderId = (typeof ALL_RULE_PROVIDERS)[number];

function getProviderRulesDir(providerId: string): string {
  const base = getRulesBase();
  if (providerId.startsWith('custom-')) {
    return path.join(base, 'custom', providerId.replace('custom-', ''));
  }
  return path.join(base, providerId);
}

function getRuleExtension(providerId: string, config?: AppConfig): '.md' | '.mdc' {
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
 * List rule files for a provider from disk.
 */
export function listProviderRules(providerId: string, config?: AppConfig): ProviderRule[] {
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
 * Read rule file content.
 */
export function readProviderRuleContent(providerId: string, ruleId: string, config?: AppConfig): string {
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  // Sanitize ruleId: disallow path traversal (.., /, \)
  const safeId = (ruleId || 'rule').replace(/\.\./g, '').replace(/[/\\]/g, '');
  if (!safeId) throw new Error(`Rule not found: ${ruleId}`);
  const filePath = path.join(dir, `${safeId}${ext}`);
  if (!isPathSafe(filePath)) {
    throw new Error('Path is not allowed');
  }
  ensurePathUnderDir(filePath, dir);
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
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
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const safeId = (ruleId || 'rule').replace(/\.\./g, '').replace(/[/\\]/g, '');
  if (!safeId) throw new Error('Invalid rule id');
  const filePath = path.join(dir, `${safeId}${ext}`);
  if (!isPathSafe(filePath)) {
    throw new Error('Path is not allowed');
  }
  ensurePathUnderDir(filePath, dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Create a new rule file.
 */
export function createProviderRule(
  providerId: string,
  name: string,
  content: string,
  config?: AppConfig
): ProviderRule {
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
  if (!isPathSafe(filePath)) {
    throw new Error('Path is not allowed');
  }
  ensurePathUnderDir(filePath, dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return {
    id: finalId,
    name: finalId.replace(/-/g, ' '),
    path: filePath,
    extension: ext,
  };
}

/**
 * Delete a rule file.
 */
export function deleteProviderRule(providerId: string, ruleId: string, config?: AppConfig): void {
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const safeId = (ruleId || 'rule').replace(/\.\./g, '').replace(/[/\\]/g, '');
  if (!safeId) return;
  const filePath = path.join(dir, `${safeId}${ext}`);
  if (!isPathSafe(filePath)) {
    throw new Error('Path is not allowed');
  }
  ensurePathUnderDir(filePath, dir);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Copy ordered rules from the provider's rules dir to a target directory.
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
 * Sync provider rules to provider path (e.g. ~/.cursor/rules).
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
