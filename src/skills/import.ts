import fs from 'fs';
import path from 'path';
import { SKILL_PROVIDERS } from './providers.js';
import { parseSkillDir, validateSkillDir } from './parse.js';
import { copySkillInto, isDuplicateSkill, getManagedSkillsDir } from './sync.js';
import { isPathSafe } from '../providers/utils.js';
import { slugify } from '../utils/slugify.js';
import type { AppConfig, Skill, SkillImportSource, ProjectSkillSource, SkillImportSourcesResponse } from '../types.js';

export type { SkillImportSource, ProjectSkillSource, SkillImportSourcesResponse };

/** Provider-specific skill subdirs within a project (Cursor, Claude). */
export const PROJECT_SKILL_SUBDIRS = [
  { key: 'cursor', subdir: '.cursor/skills', label: 'Cursor' },
  { key: 'claude', subdir: '.claude/skills', label: 'Claude Code' },
] as const;

function toSkillId(name: string): string {
  return slugify(name, 'skill');
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
 * Projects are returned with nested sources for each provider-specific subdir.
 */
export function discoverSkillSources(config: AppConfig): SkillImportSourcesResponse {
  const providers: SkillImportSource[] = [];

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

    providers.push({
      id: provider.id,
      name: provider.name,
      path: provider.path,
      exists,
      skillCount,
      error: error || undefined,
    });
  }

  const projects: ProjectSkillSource[] = [];

  for (const project of config.projectDirectories || []) {
    const projectPath = path.resolve(project.path);
    const sources: SkillImportSource[] = [];

    for (const { key, subdir, label } of PROJECT_SKILL_SUBDIRS) {
      const skillsPath = path.join(projectPath, ...subdir.split('/'));
      let exists = false;
      let skillCount = 0;
      let error: string | null = null;

      try {
        if (fs.existsSync(skillsPath) && fs.statSync(skillsPath).isDirectory()) {
          exists = true;
          skillCount = listSkillDirs(skillsPath).length;
        }
      } catch (err) {
        error = (err as Error).message;
      }

      const sourceId = `project-${project.id}__${key}`;
      sources.push({
        id: sourceId,
        name: label,
        path: skillsPath,
        exists,
        skillCount,
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
 * Resolve a project subdir source ID (project-{id}__{key}) to the full path.
 * Returns null if invalid.
 */
export function resolveProjectSourcePath(
  sourceId: string,
  projectDirectories: Array<{ id: string; path: string }>
): string | null {
  const match = sourceId.match(/^project-(.+)__(cursor|claude)$/);
  if (!match) return null;
  const [, projectId, key] = match;
  const project = projectDirectories.find((pd) => pd.id === projectId);
  if (!project) return null;
  const entry = PROJECT_SKILL_SUBDIRS.find((e) => e.key === key);
  if (!entry) return null;
  return path.join(path.resolve(project.path), ...entry.subdir.split('/'));
}

/**
 * Get skills from a source path (provider dir or project subdir).
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
      if (isDuplicateSkill(skillName, existing)) continue;
      const id = toSkillId(skillName);

      let finalId = id;
      let n = 1;
      const allIds = { ...existing };
      while (allIds[finalId]) {
        finalId = `${id}-${n++}`;
      }

      const centralPath = path.join(getManagedSkillsDir(), finalId);
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
