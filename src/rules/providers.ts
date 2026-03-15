import path from 'path';
import os from 'os';
import { getRuleCapableProviders, isProviderEnabled } from '../providers/registry.js';
import type { AppConfig } from '../types.js';

const HOME = os.homedir();

export interface RuleSyncTarget {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
}

/**
 * Additional standalone rule targets that don't appear in the registry's rulesTarget
 * but have separate AGENTS.md sync paths. These are shown on the AGENTS.md tab.
 */
const EXTRA_AGENTS_MD_TARGETS: RuleSyncTarget[] = [
  { id: 'opencode', name: 'OpenCode (AGENTS.md)', path: path.join(HOME, '.config', 'opencode', 'AGENTS.md'), type: 'file' },
  { id: 'claude', name: 'Claude Code (AGENTS.md)', path: path.join(HOME, '.claude', 'AGENTS.md'), type: 'file' },
  { id: 'gemini-cli', name: 'Gemini CLI (AGENTS.md)', path: path.join(HOME, '.gemini', 'AGENTS.md'), type: 'file' },
];

/** Rule sync targets: derived from registry + extra AGENTS.md targets. */
export const RULES_PROVIDERS: RuleSyncTarget[] = [
  ...getRuleCapableProviders().map((p) => ({
    id: p.id,
    name: p.name,
    path: p.rulesTarget!.path,
    type: p.rulesTarget!.type,
  })),
  ...EXTRA_AGENTS_MD_TARGETS,
];

/** Rule providers filtered by enabled status */
export function getRulesProviders(config: AppConfig): RuleSyncTarget[] {
  return RULES_PROVIDERS.filter((p) => isProviderEnabled(p.id, config));
}

export function getRuleProviderPath(targetId: string): RuleSyncTarget | null {
  const target = RULES_PROVIDERS.find((p) => p.id === targetId);
  return target ?? null;
}
