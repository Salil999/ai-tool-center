/**
 * Cursor hook provider.
 *
 * Native format (dedicated hooks.json file, not embedded in a larger config):
 * {
 *   "version": 1,
 *   "hooks": {
 *     "beforeShellExecution": [
 *       { "command": "script.sh", "type"?: "command"|"prompt",
 *         "matcher"?: "curl|wget", "timeout"?: 30,
 *         "failClosed"?: false, "loop_limit"?: 5 }
 *     ]
 *   }
 * }
 *
 * Docs: https://cursor.com/docs/hooks
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import type { HookItem, HookProviderDefinition } from '../../types.js';

const USER_HOOKS_PATH = path.join(os.homedir(), '.cursor', 'hooks.json');

const SUPPORTED_EVENTS = [
  // Agent lifecycle
  'sessionStart', 'sessionEnd', 'stop',
  // Tool execution
  'preToolUse', 'postToolUse', 'postToolUseFailure',
  // Subagent
  'subagentStart', 'subagentStop',
  // Shell
  'beforeShellExecution', 'afterShellExecution',
  // MCP
  'beforeMCPExecution', 'afterMCPExecution',
  // File operations
  'beforeReadFile', 'afterFileEdit',
  // Tab completions
  'beforeTabFileRead', 'afterTabFileEdit',
  // Other
  'beforeSubmitPrompt', 'preCompact',
  'afterAgentResponse', 'afterAgentThought',
] as const;

const MATCHER_EVENTS = [
  'preToolUse', 'postToolUse', 'postToolUseFailure',
  'subagentStart', 'subagentStop',
  'beforeShellExecution', 'afterShellExecution',
  'beforeReadFile', 'afterFileEdit',
  'beforeTabFileRead', 'afterTabFileEdit',
  'stop', 'afterAgentResponse', 'afterAgentThought',
] as const;

// ── Native format ─────────────────────────────────────────────────────────────

interface NativeEntry {
  command: string;
  type?: 'command' | 'prompt';
  matcher?: string;
  timeout?: number;
  loop_limit?: number | null;
  failClosed?: boolean;
}

interface NativeHooksFile {
  version: 1;
  hooks: Record<string, NativeEntry[]>;
}

// ── File I/O ──────────────────────────────────────────────────────────────────

function readFile(filePath: string): NativeHooksFile {
  if (!fs.existsSync(filePath)) return { version: 1, hooks: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<NativeHooksFile>;
    return {
      version: 1,
      hooks: parsed.hooks && typeof parsed.hooks === 'object' ? parsed.hooks : {},
    };
  } catch {
    return { version: 1, hooks: {} };
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
      if (!entry.command) continue;
      const type: HookItem['type'] = entry.type === 'prompt' ? 'prompt' : 'command';
      const item: HookItem = { event, type, command: entry.command };
      if (entry.matcher) item.matcher = entry.matcher;
      if (entry.timeout !== undefined) item.timeout = entry.timeout;
      if (entry.failClosed !== undefined) item.failClosed = entry.failClosed;
      if (entry.loop_limit !== undefined) item.loopLimit = entry.loop_limit;
      result.push(item);
    }
  }
  return result;
}

function syncToFile(hooks: HookItem[], filePath: string): void {
  // Group by event
  const grouped = new Map<string, NativeEntry[]>();
  for (const hook of hooks) {
    if (!hook.command) continue; // Cursor only supports command/prompt types with a command
    if (!grouped.has(hook.event)) grouped.set(hook.event, []);
    const entry: NativeEntry = { command: hook.command };
    if (hook.type === 'prompt') entry.type = 'prompt';
    if (hook.matcher) entry.matcher = hook.matcher;
    if (hook.timeout !== undefined) entry.timeout = hook.timeout;
    if (hook.failClosed !== undefined) entry.failClosed = hook.failClosed;
    if (hook.loopLimit !== undefined) entry.loop_limit = hook.loopLimit;
    grouped.get(hook.event)!.push(entry);
  }

  const nativeHooks: Record<string, NativeEntry[]> = {};
  for (const [event, entries] of grouped.entries()) {
    nativeHooks[event] = entries;
  }

  writeFile(filePath, { version: 1, hooks: nativeHooks });
}

// ── Provider definition ───────────────────────────────────────────────────────

export const cursorHookProvider: HookProviderDefinition = {
  id: 'cursor',
  name: 'Cursor',
  supportedEvents: SUPPORTED_EVENTS,
  matcherEvents: MATCHER_EVENTS,
  supportedTypes: ['command', 'prompt'],
  supportsProjectScope: true,
  getUserSettingsPath: () => USER_HOOKS_PATH,
  getProjectSettingsPath: (projectPath) =>
    path.join(projectPath, '.cursor', 'hooks.json'),
  importFromFile,
  syncToFile,
};
