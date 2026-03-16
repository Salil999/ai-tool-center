/**
 * Claude Code hook provider.
 *
 * Native format (hooks are a key inside the larger settings.json):
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "matcher"?: string, "hooks": [{ type, command, ... }] }]
 *   }
 * }
 *
 * Docs: https://code.claude.com/docs/en/hooks
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import type { HookItem, HookProviderDefinition } from '../../types.js';

export const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const SUPPORTED_EVENTS = [
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest',
  'Stop', 'Notification', 'SubagentStart', 'SubagentStop',
  'SessionStart', 'SessionEnd', 'UserPromptSubmit',
  'PreCompact', 'PostCompact', 'TaskCompleted', 'InstructionsLoaded',
  'ConfigChange', 'WorktreeCreate', 'WorktreeRemove',
  'TeammateIdle', 'Elicitation', 'ElicitationResult',
] as const;

const MATCHER_EVENTS = [
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest',
  'SubagentStart', 'SubagentStop', 'SessionStart', 'SessionEnd',
  'Notification', 'ConfigChange', 'PreCompact', 'PostCompact',
  'Elicitation', 'ElicitationResult',
] as const;

// ── Native format ─────────────────────────────────────────────────────────────

interface NativeDef {
  type: string;
  command?: string;
  async?: boolean;
  url?: string;
  headers?: Record<string, string>;
  prompt?: string;
  model?: string;
  timeout?: number;
  statusMessage?: string;
  [key: string]: unknown;
}

interface NativeGroup {
  matcher?: string;
  hooks: NativeDef[];
}

type NativeSection = Record<string, NativeGroup[]>;

// ── File I/O ──────────────────────────────────────────────────────────────────

function readFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>; }
  catch { return {}; }
}

function writeFile(filePath: string, data: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Import / Sync ─────────────────────────────────────────────────────────────

function importFromFile(filePath: string): HookItem[] {
  const settings = readFile(filePath);
  const nativeHooks = (settings.hooks ?? {}) as NativeSection;
  const result: HookItem[] = [];

  for (const [event, groups] of Object.entries(nativeHooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!Array.isArray(group.hooks)) continue;
      for (const def of group.hooks) {
        const type = (['http', 'prompt', 'agent'] as string[]).includes(def.type)
          ? (def.type as HookItem['type']) : 'command';
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

function syncToFile(hooks: HookItem[], filePath: string): void {
  const settings = readFile(filePath);

  // Group: event → matcher → NativeDef[]
  const grouped = new Map<string, Map<string, NativeDef[]>>();
  for (const hook of hooks) {
    const matcher = hook.matcher ?? '';
    if (!grouped.has(hook.event)) grouped.set(hook.event, new Map());
    const byMatcher = grouped.get(hook.event)!;
    if (!byMatcher.has(matcher)) byMatcher.set(matcher, []);

    const def: NativeDef = { type: hook.type };
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

  const nativeHooks: NativeSection = {};
  for (const [event, byMatcher] of grouped.entries()) {
    nativeHooks[event] = [];
    for (const [matcher, defs] of byMatcher.entries()) {
      const group: NativeGroup = { hooks: defs };
      if (matcher) group.matcher = matcher;
      nativeHooks[event].push(group);
    }
  }

  const updated = { ...settings };
  if (Object.keys(nativeHooks).length > 0) {
    (updated as Record<string, unknown>).hooks = nativeHooks;
  } else {
    delete (updated as Record<string, unknown>).hooks;
  }
  writeFile(filePath, updated);
}

// ── Provider definition ───────────────────────────────────────────────────────

export const claudeHookProvider: HookProviderDefinition = {
  id: 'claude',
  name: 'Claude Code',
  supportedEvents: SUPPORTED_EVENTS,
  matcherEvents: MATCHER_EVENTS,
  supportedTypes: ['command', 'http', 'prompt', 'agent'],
  supportsProjectScope: true,
  supportsProjectLocalScope: true,
  getUserSettingsPath: () => CLAUDE_SETTINGS_PATH,
  getProjectSettingsPath: (projectPath) =>
    path.join(projectPath, '.claude', 'settings.json'),
  getProjectLocalSettingsPath: (projectPath) =>
    path.join(projectPath, '.claude', 'settings.local.json'),
  importFromFile,
  syncToFile,
};
