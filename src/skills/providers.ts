import { getSkillCapableProviders, isProviderEnabled } from '../providers/registry.js';
import type { AppConfig } from '../types.js';

export interface SkillSyncTarget {
  id: string;
  name: string;
  path: string;
}

/** Skill sync targets: derived from registry's skill-capable providers. */
export const SKILL_PROVIDERS: SkillSyncTarget[] = getSkillCapableProviders().map((p) => ({
  id: p.id,
  name: p.name,
  path: p.skillsPath!,
}));

/** Skill providers filtered by enabled status */
export function getSkillProviders(config: AppConfig): SkillSyncTarget[] {
  return SKILL_PROVIDERS.filter((p) => isProviderEnabled(p.id, config));
}

export function getSkillProviderPath(targetId: string): string | null {
  const target = SKILL_PROVIDERS.find((p) => p.id === targetId);
  return target ? target.path : null;
}
