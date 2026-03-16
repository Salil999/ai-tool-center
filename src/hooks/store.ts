/**
 * Central hook store under ~/.ai_tools_manager/hooks/{providerId}/.
 *
 * Each provider+scope pair has its own file:
 *   user/global  → {providerId}/global.json
 *   project      → {providerId}/project-{projectId}.json
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { HookItem } from '../types.js';

export type { HookItem };

export const HOOKS_DIR = path.join(os.homedir(), '.ai_tools_manager', 'hooks');

export interface HooksData {
  order: string[];
  items: Record<string, HookItem>;
}

export function getGlobalHooksPath(providerId: string): string {
  return path.join(HOOKS_DIR, providerId, 'global.json');
}

export function getProjectHooksPath(providerId: string, projectId: string): string {
  return path.join(HOOKS_DIR, providerId, `project-${projectId}.json`);
}

export function getProjectLocalHooksPath(providerId: string, projectId: string): string {
  return path.join(HOOKS_DIR, providerId, `project-${projectId}-local.json`);
}

export function loadHooks(storePath: string): HooksData {
  try {
    if (!fs.existsSync(storePath)) return { order: [], items: {} };
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      order?: string[];
      items?: Record<string, HookItem>;
    };
    return {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
    };
  } catch {
    return { order: [], items: {} };
  }
}

export function saveHooks(data: HooksData, storePath: string): void {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
}
