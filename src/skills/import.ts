import fs from 'fs';
import path from 'path';
import os from 'os';
import { SKILL_PROVIDERS } from './providers.js';
import { parseSkillDir, validateSkillDir } from './parse.js';
import { copySkillInto } from './sync.js';
import { isPathSafe } from '../providers/utils.js';
import type { AppConfig, Skill } from '../types.js';

export interface SkillImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  skillCount: number;
  error?: string;
}

const MANAGED_SKILLS_DIR = path.join(os.homedir(), '.ai_tools_manager', 'skills');

function toSkillId(name: string): string {
  return (name || 'skill').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'skill';
}

/**
 * List skill directory paths within a parent directory (each subdir with SKILL.md).
 */
function listSkillDirs(parentPath: string): string[] {
  const resolved = path.resolve(parentPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return [];
  }
  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const skillDirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subPath = path.join(resolved, entry.name);
    if (validateSkillDir(subPath)) {
      skillDirs.push(subPath);
    }
  }
  return skillDirs;
}

/**
 * Discover skill import sources: provider directories + project directories.
 */
export function discoverSkillSources(config: AppConfig): SkillImportSource[] {
  const result: SkillImportSource[] = [];

  for (const provider of SKILL_PROVIDERS) {
    let exists = false;
    let skillCount = 0;
    let error: string | null = null;

    try {
      const providerPath = provider.path;
      if (fs.existsSync(providerPath)) {
        exists = true;
        skillCount = listSkillDirs(providerPath).length;
      }
    } catch (err) {
      error = (err as Error).message;
    }

    result.push({
      id: provider.id,
      name: provider.name,
      path: provider.path,
      exists,
      skillCount,
      error: error || undefined,
    });
  }

  for (const project of config.projectDirectories || []) {
    const skillsPath = path.join(project.path, '.agents', 'skills');
    let exists = false;
    let skillCount = 0;
    let error: string | null = null;

    try {
      if (fs.existsSync(skillsPath)) {
        exists = true;
        skillCount = listSkillDirs(skillsPath).length;
      }
    } catch (err) {
      error = (err as Error).message;
    }

    result.push({
      id: `project-${project.id}`,
      name: project.name || project.path,
      path: skillsPath,
      exists,
      skillCount,
      error: error || undefined,
    });
  }

  return result;
}

/**
 * Get skills from a source path (provider dir or project .agents/skills).
 */
function getSkillsFromPath(sourcePath: string): string[] {
  const resolved = path.resolve(sourcePath);
  if (!isPathSafe(resolved)) {
    throw new Error('Path is not allowed');
  }
  return listSkillDirs(resolved);
}

/**
 * Import skills from a source into the central store.
 * Copies each skill dir and adds to config. Skips skills that already exist (by name).
 */
export function importFromSkillSource(
  sourceId: string,
  sourcePath: string,
  config: AppConfig
): { imported: number; total: number; skillIds: string[] } {
  const skillDirs = getSkillsFromPath(sourcePath);
  const existing = config.skills || {};
  let imported = 0;
  const skillIds: string[] = [];

  for (const skillDir of skillDirs) {
    try {
      const parsed = parseSkillDir(skillDir);
      const skillName = parsed.metadata.name || path.basename(skillDir);
      const id = toSkillId(skillName);

      let finalId = id;
      let n = 1;
      const allIds = { ...existing };
      while (allIds[finalId]) {
        finalId = `${id}-${n++}`;
      }

      const centralPath = path.join(MANAGED_SKILLS_DIR, finalId);
      copySkillInto(skillDir, centralPath);

      const skill: Omit<Skill, 'id'> = {
        path: centralPath,
        name: skillName,
        enabled: true,
      };

      config.skills = config.skills || {};
      config.skills[finalId] = skill;
      config.skillOrder = config.skillOrder || [];
      if (!config.skillOrder.includes(finalId)) {
        config.skillOrder.push(finalId);
      }

      existing[finalId] = skill;
      skillIds.push(finalId);
      imported++;
    } catch (err) {
      console.warn(`Could not import skill from ${skillDir}:`, (err as Error).message);
    }
  }

  return { imported, total: Object.keys(config.skills || {}).length, skillIds };
}
