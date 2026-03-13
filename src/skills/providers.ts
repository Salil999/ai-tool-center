import path from 'path';
import os from 'os';
import { PROVIDERS } from '../providers/index.js';

const HOME = os.homedir();

export interface SkillSyncTarget {
  id: string;
  name: string;
  path: string;
}

/** Standalone skill targets (no MCP provider in this app) */
const STANDALONE_SKILL_TARGETS: SkillSyncTarget[] = [
  { id: 'copilot', name: 'GitHub Copilot', path: path.join(HOME, '.copilot', 'skills') },
  { id: 'agents', name: 'Agents (cross-client)', path: path.join(HOME, '.agents', 'skills') },
];

/** Skill sync targets: from providers with getSkillsPath + standalone (agentskills.io conventions) */
export const SKILL_PROVIDERS: SkillSyncTarget[] = [
  ...PROVIDERS.filter((p) => p.getSkillsPath).map((p) => ({
    id: p.id,
    name: p.name,
    path: p.getSkillsPath!(),
  })),
  ...STANDALONE_SKILL_TARGETS,
];

export function getSkillProviderPath(targetId: string): string | null {
  const target = SKILL_PROVIDERS.find((p) => p.id === targetId);
  return target ? target.path : null;
}
