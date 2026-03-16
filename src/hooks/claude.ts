/**
 * Claude Code hook adapter.
 * Reads/writes hooks from ~/.claude/settings.json.
 *
 * Docs: https://code.claude.com/docs/en/hooks
 *
 * Native format in settings.json:
 *   { "hooks": { "EventName": [{ "matcher"?: string, "hooks": [{ type, command, ... }] }] } }
 *
 * We flatten this into a canonical list of HookItem objects for the central store,
 * and reconstruct the nested format when syncing back.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import type { HookItem } from './store.js';

export const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

export const CLAUDE_HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PermissionRequest',
  'Stop',
  'Notification',
  'SubagentStart',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreCompact',
  'PostCompact',
  'TaskCompleted',
  'InstructionsLoaded',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'TeammateIdle',
  'Elicitation',
  'ElicitationResult',
] as const;

/** Events where a "matcher" field is meaningful */
export const CLAUDE_MATCHER_EVENTS = new Set<string>([
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PermissionRequest',
  'SubagentStart',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'Notification',
  'ConfigChange',
  'PreCompact',
  'PostCompact',
  'Elicitation',
  'ElicitationResult',
]);

// ── Native format types ────────────────────────────────────────────────────

interface NativeHookDef {
  type: string;
  command?: string;
  async?: boolean;
  url?: string;
  headers?: Record<string, string>;
  allowedEnvVars?: string[];
  prompt?: string;
  model?: string;
  timeout?: number;
  statusMessage?: string;
  [key: string]: unknown;
}

interface NativeHookGroup {
  matcher?: string;
  hooks: NativeHookDef[];
}

type NativeHooksSection = Record<string, NativeHookGroup[]>;

// ── File I/O ─────────────────────────────────────────────────────────────────

function readClaudeSettings(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeClaudeSettings(filePath: string, data: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Import hooks from a Claude settings file, flattened into canonical HookItems.
 * Defaults to the global ~/.claude/settings.json; pass a project path for project scope.
 * Does not write to the central store — caller decides what to merge.
 */
export function importFromClaudeSettings(settingsPath = CLAUDE_SETTINGS_PATH): HookItem[] {
  const settings = readClaudeSettings(settingsPath);
  const nativeHooks = (settings.hooks ?? {}) as NativeHooksSection;
  const result: HookItem[] = [];

  for (const [event, groups] of Object.entries(nativeHooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!Array.isArray(group.hooks)) continue;
      for (const def of group.hooks) {
        const type =
          def.type === 'http' || def.type === 'prompt' || def.type === 'agent'
            ? def.type
            : 'command';
        const item: HookItem = { event, type };
        if (group.matcher) item.matcher = group.matcher;
        if (def.command) item.command = def.command;
        if (def.async !== undefined) item.async = def.async;
        if (def.url) item.url = def.url;
        if (def.headers && Object.keys(def.headers).length) item.headers = def.headers;
        if (def.prompt) item.prompt = def.prompt;
        if (def.model) item.model = def.model;
        if (def.timeout !== undefined) item.timeout = def.timeout;
        if (def.statusMessage) item.statusMessage = def.statusMessage;
        result.push(item);
      }
    }
  }

  return result;
}

/**
 * Write canonical HookItem list to a Claude settings file.
 * Defaults to global ~/.claude/settings.json; pass a project path for project scope.
 * Merges with existing settings — only the `hooks` key is replaced.
 */
export function syncToClaudeSettings(hooks: HookItem[], settingsPath = CLAUDE_SETTINGS_PATH): void {
  const settings = readClaudeSettings(settingsPath);

  // Group: event → matcher → NativeHookDef[]
  const grouped = new Map<string, Map<string, NativeHookDef[]>>();

  for (const hook of hooks) {
    const matcher = hook.matcher ?? '';
    if (!grouped.has(hook.event)) grouped.set(hook.event, new Map());
    const byMatcher = grouped.get(hook.event)!;
    if (!byMatcher.has(matcher)) byMatcher.set(matcher, []);

    const def: NativeHookDef = { type: hook.type };
    if (hook.type === 'command' && hook.command) def.command = hook.command;
    if (hook.async !== undefined) def.async = hook.async;
    if (hook.type === 'http') {
      if (hook.url) def.url = hook.url;
      if (hook.headers && Object.keys(hook.headers).length) def.headers = hook.headers;
    }
    if (hook.type === 'prompt' || hook.type === 'agent') {
      if (hook.prompt) def.prompt = hook.prompt;
      if (hook.model) def.model = hook.model;
    }
    if (hook.timeout !== undefined) def.timeout = hook.timeout;
    if (hook.statusMessage) def.statusMessage = hook.statusMessage;

    byMatcher.get(matcher)!.push(def);
  }

  const nativeHooks: NativeHooksSection = {};
  for (const [event, byMatcher] of grouped.entries()) {
    nativeHooks[event] = [];
    for (const [matcher, defs] of byMatcher.entries()) {
      const group: NativeHookGroup = { hooks: defs };
      if (matcher) group.matcher = matcher;
      nativeHooks[event].push(group);
    }
  }

  const updated: Record<string, unknown> = { ...settings };
  if (Object.keys(nativeHooks).length > 0) {
    updated.hooks = nativeHooks;
  } else {
    delete updated.hooks;
  }
  writeClaudeSettings(settingsPath, updated);
}
