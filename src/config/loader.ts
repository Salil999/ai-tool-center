import fs from 'fs';
import path from 'path';
import os from 'os';
import { importFromProvider, getProviderPath } from '../providers/index.js';
import { syncSkillsFromDisk } from '../skills/sync.js';
import type { AppConfig } from '../types.js';

/** MCP config and OAuth storage: ~/.ai_tools_manager/mcp/ */
const MCP_DIR = path.join(os.homedir(), '.ai_tools_manager', 'mcp');

export const DEFAULT_CONFIG = {
  servers: {},
  customProviders: [],
  auditOptions: { maxEntries: 100 },
  skills: {},
  skillOrder: [] as string[],
  projectDirectories: [],
} satisfies AppConfig;

function getDefaultConfigPath(): string {
  const homeConfig = path.join(MCP_DIR, 'config.json');
  try {
    if (!fs.existsSync(MCP_DIR)) {
      fs.mkdirSync(MCP_DIR, { recursive: true });
    }
    return homeConfig;
  } catch {
    const cwdDir = path.join(process.cwd(), '.ai_tools_manager', 'mcp');
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
      const cursorPath = getProviderPath('cursor');
      if (cursorPath && fs.existsSync(cursorPath)) {
        config.servers = importFromProvider('cursor');
      }
    } catch (err) {
      console.warn('Could not import from Cursor mcp.json:', (err as Error).message);
    }
    syncSkillsFromDisk(config);
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
    if (syncSkillsFromDisk(merged)) {
      saveConfig(resolvedPath, merged);
    }
    return merged;
  } catch (err) {
    throw new Error(`Failed to load config: ${(err as Error).message}`);
  }
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

/** Base directory for config (~/.ai_tools_manager). Used for Reset/Export/Import. */
export function getConfigBaseDir(): string {
  return path.join(os.homedir(), '.ai_tools_manager');
}
