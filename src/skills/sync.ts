import fs from 'fs';
import path from 'path';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import { SKILL_PROVIDERS, getSkillProviderPath } from './providers.js';
import type { AppConfig, Skill } from '../types.js';

/**
 * Return skills as a record with keys in display/sync order.
 */
export function getOrderedSkills(config: AppConfig): Record<string, Omit<Skill, 'id'>> {
  const skills = config.skills || {};
  const order = config.skillOrder || Object.keys(skills);
  const orderedIds = order.filter((id) => skills[id]);
  const extraIds = Object.keys(skills).filter((id) => !orderedIds.includes(id));
  const ids = [...orderedIds, ...extraIds];
  const result: Record<string, Omit<Skill, 'id'>> = {};
  for (const id of ids) {
    result[id] = skills[id];
  }
  return result;
}

/**
 * Copy contents of a skill directory into a specific target directory.
 * Used when importing external skills into the central store.
 */
export function copySkillInto(srcPath: string, destDir: string): void {
  const src = path.resolve(srcPath);
  const dest = path.resolve(destDir);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    throw new Error(`Skill directory not found: ${src}`);
  }
  if (!isPathSafe(dest)) {
    throw new Error('Destination path is not allowed');
  }
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(src, entry.name);
    const destEntry = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copySkillDir(srcEntry, dest);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

/**
 * Copy a skill directory (recursively) to destination.
 */
function copySkillDir(srcPath: string, destPath: string): void {
  const src = path.resolve(srcPath);
  const dest = path.resolve(destPath);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    throw new Error(`Skill directory not found: ${src}`);
  }
  if (!isPathSafe(dest)) {
    throw new Error('Destination path is not allowed');
  }
  const dirName = path.basename(src);
  const targetDir = path.join(dest, dirName);
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(src, entry.name);
    const destEntry = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copySkillDir(srcEntry, targetDir);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

/**
 * Sync enabled skills to a provider target (e.g. cursor, agents).
 */
export function syncSkillsToProvider(
  targetId: string,
  skillPaths: string[]
): { path: string; success: boolean; syncedCount: number } {
  const targetPath = getSkillProviderPath(targetId);
  if (!targetPath) {
    throw new Error(`Unknown skill provider: ${targetId}`);
  }
  const resolved = path.resolve(targetPath);
  if (!isPathSafe(resolved)) {
    throw new Error('Provider path is not allowed');
  }
  fs.mkdirSync(resolved, { recursive: true });
  let syncedCount = 0;
  for (const skillPath of skillPaths) {
    const src = resolvePath(skillPath);
    if (!isPathSafe(src) || !fs.existsSync(src)) continue;
    copySkillDir(src, resolved);
    syncedCount++;
  }
  return { path: resolved, success: true, syncedCount };
}

/**
 * Sync enabled skills to a project directory (.agents/skills/).
 */
export function syncSkillsToProject(
  projectPath: string,
  skillPaths: string[]
): { path: string; success: boolean; syncedCount: number } {
  const resolved = resolvePath(projectPath);
  if (!isPathSafe(resolved)) {
    throw new Error('Project path is not allowed');
  }
  const skillsDir = path.join(resolved, '.agents', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });
  let syncedCount = 0;
  for (const skillPath of skillPaths) {
    const src = resolvePath(skillPath);
    if (!isPathSafe(src) || !fs.existsSync(src)) continue;
    copySkillDir(src, skillsDir);
    syncedCount++;
  }
  return { path: skillsDir, success: true, syncedCount };
}

export { SKILL_PROVIDERS };
