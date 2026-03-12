import path from 'path';
import os from 'os';

const HOME = os.homedir();

export interface SkillSyncTarget {
  id: string;
  name: string;
  path: string;
}

/** Skill sync targets for LLM providers (agentskills.io conventions) */
export const SKILL_PROVIDERS: SkillSyncTarget[] = [
  { id: 'cursor', name: 'Cursor', path: path.join(HOME, '.cursor', 'skills') },
  { id: 'claude', name: 'Claude Code', path: path.join(HOME, '.claude', 'skills') },
  { id: 'gemini-cli', name: 'Gemini CLI', path: path.join(HOME, '.gemini', 'skills') },
  { id: 'copilot', name: 'GitHub Copilot', path: path.join(HOME, '.copilot', 'skills') },
  { id: 'agents', name: 'Agents (cross-client)', path: path.join(HOME, '.agents', 'skills') },
];

export function getSkillProviderPath(targetId: string): string | null {
  const target = SKILL_PROVIDERS.find((p) => p.id === targetId);
  return target ? target.path : null;
}
