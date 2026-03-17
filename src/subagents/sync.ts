import fs from 'fs';
import path from 'path';
import os from 'os';
import { getOrderedIds } from '../api/route-utils.js';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import { SUBAGENT_PROVIDERS } from './providers.js';
import type { AppConfig, Subagent, SubagentImportSource, ProjectSubagentSource } from '../types.js';

const MANAGED_DIR = path.join(os.homedir(), '.ai_tool_center', 'subagents');

/** Get the central managed subagents directory. */
export function getManagedSubagentsDir(): string {
  if (!fs.existsSync(MANAGED_DIR)) {
    fs.mkdirSync(MANAGED_DIR, { recursive: true });
  }
  return MANAGED_DIR;
}

/** Get ordered subagents from config. */
export function getOrderedSubagents(
  config: AppConfig
): Record<string, Omit<Subagent, 'id'>> {
  const subagents = config.subagents || {};
  const orderedIds = getOrderedIds(subagents, config.subagentOrder);
  const result: Record<string, Omit<Subagent, 'id'>> = {};
  for (const id of orderedIds) {
    if (subagents[id]) result[id] = subagents[id];
  }
  return result;
}

/** Check if a subagent name already exists in the config. */
export function isDuplicateSubagent(
  name: string,
  subagents: Record<string, Omit<Subagent, 'id'>>
): boolean {
  const lower = name.toLowerCase();
  return Object.values(subagents).some((s) => s.name.toLowerCase() === lower);
}

// ── File helpers ───────────────────────────────────────────────────

/** All file extensions across all providers. */
const ALL_EXTENSIONS = [...new Set(SUBAGENT_PROVIDERS.flatMap((p) => p.fileExtensions))];

/** Count agent files in a directory (matching any provider's extensions). */
function countAgentFiles(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  try {
    return fs.readdirSync(dirPath).filter((f) => ALL_EXTENSIONS.some((ext) => f.endsWith(ext))).length;
  } catch {
    return 0;
  }
}

/** List all agent files in a directory (matching any provider's extensions). */
export function listAgentFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  try {
    return fs.readdirSync(dirPath)
      .filter((f) => ALL_EXTENSIONS.some((ext) => f.endsWith(ext)))
      .map((f) => path.join(dirPath, f));
  } catch {
    return [];
  }
}

/** Strip any known agent extension from a filename to get the base name. */
function agentBaseName(filePath: string): string {
  let name = path.basename(filePath);
  // Strip longest matching extension first (e.g. '.agent.md' before '.md')
  const sorted = [...ALL_EXTENSIONS].sort((a, b) => b.length - a.length);
  for (const ext of sorted) {
    if (name.endsWith(ext)) {
      name = name.slice(0, -ext.length);
      break;
    }
  }
  return name;
}

// ── Discovery ──────────────────────────────────────────────────────

function probeDir(dir: { id: string; name: string; path: string }): SubagentImportSource {
  let exists = false;
  let agentCount = 0;
  let error: string | undefined;
  try {
    exists = fs.existsSync(dir.path);
    if (exists) agentCount = countAgentFiles(dir.path);
  } catch (err) {
    error = (err as Error).message;
  }
  return { id: dir.id, name: dir.name, path: dir.path, exists, agentCount, error };
}

/** Discover subagent import sources from global provider directories. */
export function discoverGlobalSources(): SubagentImportSource[] {
  return SUBAGENT_PROVIDERS.flatMap((p) => p.globalDirs().map(probeDir));
}

/** Discover subagent import sources from project directories. */
export function discoverProjectSources(config: AppConfig): ProjectSubagentSource[] {
  const projectDirs = config.projectDirectories || [];
  return projectDirs.map((pd) => {
    const resolved = resolvePath(pd.path);
    const entries = SUBAGENT_PROVIDERS.flatMap((p) => p.projectDirs(pd.path, resolved));
    const sources = entries.map(probeDir);
    return { id: pd.id, name: pd.name || path.basename(pd.path), path: pd.path, sources };
  });
}

// ── Import ─────────────────────────────────────────────────────────

/** Import subagent files from a directory into the central store. */
export function importSubagentsFromDir(
  sourceDir: string,
  config: AppConfig
): { imported: number; total: number } {
  const files = listAgentFiles(sourceDir);
  let imported = 0;

  for (const file of files) {
    const baseName = agentBaseName(file);
    if (isDuplicateSubagent(baseName, config.subagents || {})) continue;

    // Always store as .md in managed directory
    const destFileName = baseName + '.md';
    const destPath = path.join(getManagedSubagentsDir(), destFileName);
    fs.copyFileSync(file, destPath);

    const id = baseName;
    config.subagents = config.subagents || {};
    config.subagents[id] = {
      name: baseName,
      path: destPath,
      enabled: true,
    };
    config.subagentOrder = config.subagentOrder || [];
    if (!config.subagentOrder.includes(id)) {
      config.subagentOrder.push(id);
    }
    imported++;
  }

  return { imported, total: files.length };
}

// ── Sync to providers ──────────────────────────────────────────────

export interface SyncTarget {
  id: string;
  name: string;
  path: string;
}

/** Get available sync targets (provider agent directories). */
export function getSyncTargets(config: AppConfig): { providers: SyncTarget[]; projects: SyncTarget[] } {
  const providers: SyncTarget[] = SUBAGENT_PROVIDERS.flatMap((p) =>
    p.globalDirs().map((d) => ({ id: d.id, name: d.name, path: d.path }))
  );

  const projects: SyncTarget[] = [];
  for (const pd of config.projectDirectories || []) {
    const resolved = resolvePath(pd.path);
    for (const p of SUBAGENT_PROVIDERS) {
      for (const dir of p.projectDirs(pd.path, resolved)) {
        projects.push({
          id: dir.id,
          name: `${dir.name} (${pd.name || path.basename(pd.path)})`,
          path: dir.path,
        });
      }
    }
  }

  return { providers, projects };
}

/** Sync enabled subagents to a target directory. */
export function syncSubagentsTo(
  targetDir: string,
  config: AppConfig
): { path: string; success: boolean; syncedCount: number } {
  const resolved = resolvePath(targetDir);
  if (!isPathSafe(resolved)) {
    throw new Error('Target path is not allowed');
  }

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }

  const subagents = config.subagents || {};
  let syncedCount = 0;

  for (const [_id, sub] of Object.entries(subagents)) {
    if (!sub.enabled) continue;
    if (!fs.existsSync(sub.path)) continue;

    const destFile = path.join(resolved, path.basename(sub.path));
    fs.copyFileSync(sub.path, destFile);
    syncedCount++;
  }

  return { path: resolved, success: true, syncedCount };
}
