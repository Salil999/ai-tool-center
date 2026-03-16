/**
 * VS Code hook provider (Workspace scope only).
 *
 * Native format at .github/hooks/*.json:
 * {
 *   "hooks": {
 *     "PreToolUse": [
 *       {
 *         "type": "command",
 *         "command": "./scripts/validate.sh",
 *         "windows"?: "...",
 *         "linux"?: "...",
 *         "osx"?: "...",
 *         "cwd"?: "...",
 *         "env"?: { "KEY": "value" },
 *         "timeout"?: 30
 *       }
 *     ]
 *   }
 * }
 *
 * Docs: https://code.visualstudio.com/docs/copilot/customization/hooks
 */

import path from 'path';
import fs from 'fs';
import type { HookItem, HookProviderDefinition } from '../../types.js';

const SUPPORTED_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'PreCompact',
  'SubagentStart',
  'SubagentStop',
  'Stop',
] as const;

// ── Native format ─────────────────────────────────────────────────────────────

interface NativeEntry {
  type: 'command';
  command: string;
  windows?: string;
  linux?: string;
  osx?: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface NativeHooksFile {
  hooks: Record<string, NativeEntry[]>;
}

// ── File I/O ──────────────────────────────────────────────────────────────────

function readFile(filePath: string): NativeHooksFile {
  if (!fs.existsSync(filePath)) return { hooks: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<NativeHooksFile>;
    return {
      hooks: parsed.hooks && typeof parsed.hooks === 'object' ? parsed.hooks : {},
    };
  } catch {
    return { hooks: {} };
  }
}

function writeFile(filePath: string, data: NativeHooksFile): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Import / Sync ─────────────────────────────────────────────────────────────

function importFromFile(filePath: string): HookItem[] {
  const file = readFile(filePath);
  const result: HookItem[] = [];

  for (const [event, entries] of Object.entries(file.hooks)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry.type !== 'command' || !entry.command) continue;
      const item: HookItem = { event, type: 'command', command: entry.command };
      if (entry.windows) item.windows = entry.windows;
      if (entry.linux) item.linux = entry.linux;
      if (entry.osx) item.osx = entry.osx;
      if (entry.cwd) item.cwd = entry.cwd;
      if (entry.env && Object.keys(entry.env).length > 0) item.env = entry.env;
      if (entry.timeout !== undefined) item.timeout = entry.timeout;
      result.push(item);
    }
  }
  return result;
}

function syncToFile(hooks: HookItem[], filePath: string): void {
  const grouped = new Map<string, NativeEntry[]>();
  for (const hook of hooks) {
    if (hook.type !== 'command' || !hook.command) continue;
    if (!grouped.has(hook.event)) grouped.set(hook.event, []);
    const entry: NativeEntry = { type: 'command', command: hook.command };
    if (hook.windows) entry.windows = hook.windows;
    if (hook.linux) entry.linux = hook.linux;
    if (hook.osx) entry.osx = hook.osx;
    if (hook.cwd) entry.cwd = hook.cwd;
    if (hook.env && Object.keys(hook.env).length > 0) entry.env = hook.env;
    if (hook.timeout !== undefined) entry.timeout = hook.timeout;
    grouped.get(hook.event)!.push(entry);
  }

  const nativeHooks: Record<string, NativeEntry[]> = {};
  for (const [event, entries] of grouped.entries()) {
    nativeHooks[event] = entries;
  }

  writeFile(filePath, { hooks: nativeHooks });
}

// ── Provider definition ───────────────────────────────────────────────────────

export const vscodeHookProvider: HookProviderDefinition = {
  id: 'vscode',
  name: 'VS Code',
  supportedEvents: SUPPORTED_EVENTS,
  matcherEvents: [],
  supportedTypes: ['command'],
  supportsProjectScope: true,
  supportsProjectLocalScope: false,
  supportsGlobalScope: false,
  getUserSettingsPath: () => '',
  getProjectSettingsPath: (projectPath) =>
    path.join(projectPath, '.github', 'hooks', 'hooks.json'),
  importFromFile,
  syncToFile,
};
