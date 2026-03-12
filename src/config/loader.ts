import fs from 'fs';
import path from 'path';
import os from 'os';
import cursorProvider from '../providers/cursor.js';
import { copySkillInto } from '../skills/sync.js';
import type { AppConfig } from '../types.js';

const OLD_SKILLS_DIR = path.join(os.homedir(), '.mcp-manager', 'skills');
const NEW_SKILLS_DIR = path.join(os.homedir(), '.ai_tools_manager', 'skills');

export const DEFAULT_CONFIG: AppConfig = {
  servers: {},
  customProviders: [],
  auditOptions: { maxEntries: 100 },
  skills: {},
  skillOrder: [],
  projectDirectories: [],
};

function getDefaultConfigPath(): string {
  const homeDir = path.join(os.homedir(), '.mcp-manager');
  const homeConfig = path.join(homeDir, 'config.json');
  try {
    if (!fs.existsSync(homeDir)) {
      fs.mkdirSync(homeDir, { recursive: true });
    }
    return homeConfig;
  } catch {
    const cwdDir = path.join(process.cwd(), '.mcp-manager');
    try {
      if (!fs.existsSync(cwdDir)) {
        fs.mkdirSync(cwdDir, { recursive: true });
      }
      return path.join(cwdDir, 'config.json');
    } catch (e) {
      throw new Error(`Cannot create config directory: ${(e as Error).message}`);
    }
  }
}

/**
 * Load config from file. Creates default if not exists.
 * On first run, optionally import from ~/.cursor/mcp.json if it exists.
 */
export function loadConfig(configPath?: string): AppConfig {
  const resolvedPath = configPath || getDefaultConfigPath();
  const dir = path.dirname(resolvedPath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    throw new Error(`Cannot create config directory: ${(err as Error).message}`);
  }

  if (!fs.existsSync(resolvedPath)) {
    const config: AppConfig = { ...DEFAULT_CONFIG };
    try {
      if (fs.existsSync(cursorProvider.getPath())) {
        config.servers = cursorProvider.importConfig();
      }
    } catch (err) {
      console.warn('Could not import from Cursor mcp.json:', (err as Error).message);
    }
    saveConfig(resolvedPath, config);
    return config;
  }

  try {
    const data = fs.readFileSync(resolvedPath, 'utf8');
    const config = JSON.parse(data) as AppConfig;
    const merged: AppConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      servers: config.servers || {},
      auditOptions: config.auditOptions ?? DEFAULT_CONFIG.auditOptions,
      skills: config.skills || {},
      skillOrder: config.skillOrder ?? [],
      projectDirectories: config.projectDirectories ?? [],
    };
    if (migrateSkillsFromMcpManager(merged)) {
      saveConfig(resolvedPath, merged);
    }
    return merged;
  } catch (err) {
    throw new Error(`Failed to load config: ${(err as Error).message}`);
  }
}

/**
 * Migrate skills from ~/.mcp-manager/skills/ to ~/.ai_tools_manager/skills/.
 * Copies each skill dir and updates config paths.
 * Returns true if any migration was performed.
 */
function migrateSkillsFromMcpManager(config: AppConfig): boolean {
  const skills = config.skills;
  if (!skills) return false;

  let changed = false;
  const oldDirNorm = path.resolve(OLD_SKILLS_DIR) + path.sep;

  for (const [skillId, skill] of Object.entries(skills)) {
    const skillPath = skill.path;
    if (!skillPath || typeof skillPath !== 'string') continue;

    const resolved = path.resolve(skillPath);
    if (!resolved.startsWith(oldDirNorm)) continue;

    const newPath = path.join(NEW_SKILLS_DIR, skillId);
    try {
      if (fs.existsSync(resolved)) {
        fs.mkdirSync(path.dirname(newPath), { recursive: true });
        copySkillInto(resolved, newPath);
      } else {
        fs.mkdirSync(newPath, { recursive: true });
      }
      skill.path = newPath;
      changed = true;
    } catch (err) {
      console.warn(`Could not migrate skill ${skillId}:`, (err as Error).message);
    }
  }

  return changed;
}

export function saveConfig(configPath: string, config: AppConfig): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function getConfigPath(override?: string): string {
  return override || process.env.MCP_MANAGER_CONFIG || getDefaultConfigPath();
}
