import path from 'path';
import os from 'os';
import { PROVIDERS } from '../providers/index.js';

const HOME = os.homedir();

export interface RuleSyncTarget {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
}

/** Standalone rule targets (no MCP provider in this app). Includes AGENTS.md providers (claude, gemini-cli, agents, opencode) - shown only on AGENTS.md tab. */
const STANDALONE_RULE_TARGETS: RuleSyncTarget[] = [
  { id: 'agents', name: 'Universal Agent (AGENTS.md)', path: path.join(HOME, '.agents'), type: 'directory' },
  { id: 'augment', name: 'Augment Rules', path: path.join(HOME, '.augment', 'rules'), type: 'directory' },
  { id: 'opencode', name: 'OpenCode (AGENTS.md)', path: path.join(HOME, '.config', 'opencode', 'AGENTS.md'), type: 'file' },
  { id: 'claude', name: 'Claude Code (AGENTS.md)', path: path.join(HOME, '.claude', 'AGENTS.md'), type: 'file' },
  { id: 'gemini-cli', name: 'Gemini CLI (AGENTS.md)', path: path.join(HOME, '.gemini', 'AGENTS.md'), type: 'file' },
  { id: 'windsurf', name: 'Windsurf Rules', path: path.join(HOME, '.codeium', 'windsurf', 'rules'), type: 'directory' },
  { id: 'continue', name: 'Continue Rules', path: path.join(HOME, '.continue', 'rules'), type: 'directory' },
];

/** Rule sync targets: from providers with getRulesPath + standalone */
export const RULES_PROVIDERS: RuleSyncTarget[] = [
  ...PROVIDERS.filter((p) => p.getRulesPath).map((p) => {
    const pPath = p.getRulesPath!();
    const type: 'file' | 'directory' = pPath.endsWith('.md') ? 'file' : 'directory';
    return { id: p.id, name: p.name, path: pPath, type };
  }),
  ...STANDALONE_RULE_TARGETS,
];

export function getRuleProviderPath(targetId: string): RuleSyncTarget | null {
  const target = RULES_PROVIDERS.find((p) => p.id === targetId);
  return target ?? null;
}
