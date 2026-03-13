import fs from 'fs';
import path from 'path';
import os from 'os';
import { isPathSafe } from '../providers/utils.js';
import type { AppConfig, ProviderRule } from '../types.js';

const RULES_BASE = process.env.AI_TOOLS_MANAGER_RULES_DIR || path.join(os.homedir(), '.ai_tools_manager', 'rules');

/** Providers that support multiple rule files (directory of .md/.mdc) */
export const MULTI_FILE_RULE_PROVIDERS = ['cursor', 'augment'] as const;

/** Single-file providers (one AGENTS.md) - none; AGENTS.md providers are in the AGENTS.md tab */
export const SINGLE_FILE_RULE_PROVIDERS = [] as const;

/** All provider rule types */
export const ALL_RULE_PROVIDERS = [...MULTI_FILE_RULE_PROVIDERS, ...SINGLE_FILE_RULE_PROVIDERS] as const;

export type MultiFileRuleProviderId = (typeof MULTI_FILE_RULE_PROVIDERS)[number];
export type SingleFileRuleProviderId = (typeof SINGLE_FILE_RULE_PROVIDERS)[number];
export type RuleProviderId = (typeof ALL_RULE_PROVIDERS)[number];

function getProviderRulesDir(providerId: string): string {
  if (providerId.startsWith('custom-')) {
    return path.join(RULES_BASE, 'custom', providerId.replace('custom-', ''));
  }
  return path.join(RULES_BASE, providerId);
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
  return (name || 'rule')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    || 'rule';
}

const OPENCODE_RULE_ID = 'AGENTS';

/**
 * List rule files for a provider from disk.
 */
export function listProviderRules(providerId: string, config?: AppConfig): ProviderRule[] {
  if (SINGLE_FILE_RULE_PROVIDERS.includes(providerId as SingleFileRuleProviderId)) {
    const dir = getProviderRulesDir(providerId);
    const ext = '.md';
    const filePath = path.join(dir, `${OPENCODE_RULE_ID}${ext}`);
    return [{
      id: OPENCODE_RULE_ID,
      name: 'AGENTS.md',
      path: filePath,
      extension: ext,
    }];
  }
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
  if (!MULTI_FILE_RULE_PROVIDERS.includes(providerId as MultiFileRuleProviderId)) {
    return [];
  }
  const dir = getProviderRulesDir(providerId);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }
  const ext = getRuleExtension(providerId);
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
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const filePath = path.join(dir, `${ruleId}${ext}`);
  if (!isPathSafe(filePath)) {
    throw new Error(`Rule not found: ${ruleId}`);
  }
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
  const filePath = path.join(dir, `${ruleId}${ext}`);
  if (!isPathSafe(filePath)) {
    throw new Error('Path is not allowed');
  }
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
  if (SINGLE_FILE_RULE_PROVIDERS.includes(providerId as SingleFileRuleProviderId)) {
    const filePath = path.join(dir, `${OPENCODE_RULE_ID}${ext}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return {
      id: OPENCODE_RULE_ID,
      name: 'AGENTS.md',
      path: filePath,
      extension: ext,
    };
  }
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
  if (SINGLE_FILE_RULE_PROVIDERS.includes(providerId as SingleFileRuleProviderId)) {
    return;
  }
  const dir = getProviderRulesDir(providerId);
  const ext = getRuleExtension(providerId, config);
  const filePath = path.join(dir, `${ruleId}${ext}`);
  if (!isPathSafe(filePath)) {
    throw new Error('Path is not allowed');
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

const OPENCODE_SYNC_PATH = path.join(os.homedir(), '.config', 'opencode', 'AGENTS.md');

/**
 * Sync provider rules to provider path (e.g. ~/.cursor/rules).
 */
export function syncProviderRulesToTarget(
  providerId: string,
  targetPath: string,
  config: AppConfig
): { path: string; syncedCount: number } {
  if (SINGLE_FILE_RULE_PROVIDERS.includes(providerId as SingleFileRuleProviderId)) {
    const srcPath = path.join(getProviderRulesDir(providerId), `${OPENCODE_RULE_ID}.md`);
    const destPath = targetPath.endsWith('.md') ? targetPath : path.join(targetPath, 'AGENTS.md');
    if (!isPathSafe(destPath)) {
      throw new Error('Target path is not allowed');
    }
    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      return { path: destPath, syncedCount: 1 };
    }
    return { path: destPath, syncedCount: 0 };
  }
  if (providerId.startsWith('custom-')) {
    const customId = providerId.replace('custom-', '');
    const custom = (config?.customRuleConfigs || []).find((c) => c.id === customId);
    if (!custom) return { path: targetPath, syncedCount: 0 };
    const rules = getOrderedProviderRules(providerId, config);
    const ext = getRuleExtension(providerId, config);
    if (!isPathSafe(targetPath)) {
      throw new Error('Target path is not allowed');
    }
    let syncedCount = 0;
    if (custom.type === 'file') {
      const src = rules[0] ? path.join(getProviderRulesDir(providerId), `${rules[0].id}${ext}`) : path.join(getProviderRulesDir(providerId), `rule${ext}`);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(src, targetPath);
        syncedCount = 1;
      }
    } else {
      fs.mkdirSync(targetPath, { recursive: true });
      for (const rule of rules) {
        const src = path.join(getProviderRulesDir(providerId), `${rule.id}${ext}`);
        if (fs.existsSync(src)) {
          const dest = path.join(targetPath, `${rule.id}${ext}`);
          fs.copyFileSync(src, dest);
          syncedCount++;
        }
      }
    }
    return { path: targetPath, syncedCount };
  }

  const rules = getOrderedProviderRules(providerId, config);
  const ext = getRuleExtension(providerId, config);
  if (!isPathSafe(targetPath)) {
    throw new Error('Target path is not allowed');
  }
  fs.mkdirSync(targetPath, { recursive: true });
  let syncedCount = 0;
  for (const rule of rules) {
    const src = path.join(getProviderRulesDir(providerId), `${rule.id}${ext}`);
    if (fs.existsSync(src)) {
      const dest = path.join(targetPath, `${rule.id}${ext}`);
      fs.copyFileSync(src, dest);
      syncedCount++;
    }
  }
  return { path: targetPath, syncedCount };
}
