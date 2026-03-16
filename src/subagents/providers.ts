/**
 * Subagent provider registry.
 *
 * Each provider declares its agent directory paths and validation rules.
 * To add a new provider, add an entry to SUBAGENT_PROVIDERS — everything
 * else (lint, sync, import, API, UI) picks it up automatically.
 */
import path from 'path';
import os from 'os';
import type { SubagentMetadata } from './parse.js';
import type { SubagentLintFinding } from '../types.js';

// ── Types ──────────────────────────────────────────────────────────

export interface AgentDirEntry {
  id: string;
  name: string;
  path: string;
}

export interface SubagentProviderDefinition {
  /** Unique identifier (e.g. 'claude', 'cursor'). Used as key in lint reports. */
  id: string;
  /** Human-readable display name (e.g. 'Claude Code'). */
  name: string;
  /** Global (user-scope) agent directories. */
  globalDirs: () => AgentDirEntry[];
  /** Per-project agent directories. */
  projectDirs: (projectPath: string, resolvedPath: string) => AgentDirEntry[];
  /** File extensions to scan for agent files (e.g. ['.md'], ['.agent.md']). */
  fileExtensions: string[];
  /** Validate parsed frontmatter + body. Return findings. */
  lint: (meta: SubagentMetadata, body: string) => SubagentLintFinding[];
}

// ── Helpers ────────────────────────────────────────────────────────

const HOME = os.homedir();
const NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function finding(field: string, level: SubagentLintFinding['level'], message: string): SubagentLintFinding {
  return { field, level, message };
}

/** Warn about fields that belong to other providers. */
function warnForeignFields(
  meta: SubagentMetadata,
  ownerId: string,
  foreignMap: Record<string, string[]>
): SubagentLintFinding[] {
  const findings: SubagentLintFinding[] = [];
  for (const [providerId, fields] of Object.entries(foreignMap)) {
    for (const f of fields) {
      if ((meta as Record<string, unknown>)[f] != null) {
        findings.push(finding(f, 'warning', `${f} is a ${providerId} field and will be ignored by ${ownerId}`));
      }
    }
  }
  return findings;
}

// ── Claude Code ────────────────────────────────────────────────────

const CLAUDE_MODEL_VALUES = new Set(['sonnet', 'opus', 'haiku', 'inherit']);
const CLAUDE_PERMISSION_MODES = new Set(['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan']);
const CLAUDE_MEMORY_VALUES = new Set(['user', 'project', 'local']);

const claude: SubagentProviderDefinition = {
  id: 'claude',
  name: 'Claude Code',
  fileExtensions: ['.md'],
  globalDirs: () => [
    { id: 'claude-global', name: 'Claude Code', path: path.join(HOME, '.claude', 'agents') },
  ],
  projectDirs: (projectPath, resolved) => [
    { id: `claude-project-${projectPath}`, name: 'Claude Code', path: path.join(resolved, '.claude', 'agents') },
  ],
  lint: (meta, body) => {
    const f: SubagentLintFinding[] = [];

    if (!meta.name || typeof meta.name !== 'string' || !meta.name.trim()) {
      f.push(finding('name', 'error', 'name is required for Claude Code subagents'));
    } else if (!NAME_REGEX.test(meta.name)) {
      f.push(finding('name', 'error', 'name must contain only lowercase letters, numbers, and hyphens (no leading digit)'));
    }

    if (!meta.description || typeof meta.description !== 'string' || !meta.description.trim()) {
      f.push(finding('description', 'error', 'description is required for Claude Code subagents'));
    }

    if (meta.model != null) {
      const m = String(meta.model);
      if (!CLAUDE_MODEL_VALUES.has(m) && !m.startsWith('claude-')) {
        f.push(finding('model', 'warning', `model "${m}" is not a recognized value (expected: sonnet, opus, haiku, inherit, or a claude-* model ID)`));
      }
    }

    if (meta.permissionMode != null && !CLAUDE_PERMISSION_MODES.has(meta.permissionMode)) {
      f.push(finding('permissionMode', 'error', `permissionMode must be one of: ${[...CLAUDE_PERMISSION_MODES].join(', ')}`));
    }
    if (meta.maxTurns != null && (!Number.isInteger(meta.maxTurns) || meta.maxTurns < 1)) {
      f.push(finding('maxTurns', 'error', 'maxTurns must be a positive integer'));
    }
    if (meta.memory != null && !CLAUDE_MEMORY_VALUES.has(meta.memory)) {
      f.push(finding('memory', 'error', `memory must be one of: ${[...CLAUDE_MEMORY_VALUES].join(', ')}`));
    }
    if (meta.isolation != null && meta.isolation !== 'worktree') {
      f.push(finding('isolation', 'error', 'isolation must be "worktree" if specified'));
    }
    if (meta.background != null && typeof meta.background !== 'boolean') {
      f.push(finding('background', 'error', 'background must be a boolean'));
    }
    if (meta.tools != null && !Array.isArray(meta.tools)) {
      f.push(finding('tools', 'error', 'tools must be an array of strings'));
    }
    if (meta.disallowedTools != null && !Array.isArray(meta.disallowedTools)) {
      f.push(finding('disallowedTools', 'error', 'disallowedTools must be an array of strings'));
    }
    if (meta.skills != null && !Array.isArray(meta.skills)) {
      f.push(finding('skills', 'error', 'skills must be an array of strings'));
    }
    if (!body.trim()) {
      f.push(finding('body', 'warning', 'Subagent has no system prompt (markdown body is empty)'));
    }

    f.push(...warnForeignFields(meta, 'Claude Code', {
      'Cursor-only': ['readonly'],
      'OpenCode-only': ['mode', 'temperature', 'top_p', 'steps', 'disable', 'hidden', 'permission'],
      'VS Code-only': ['argument-hint', 'user-invocable', 'disable-model-invocation', 'target', 'agents', 'handoffs'],
    }));

    return f;
  },
};

// ── Cursor ─────────────────────────────────────────────────────────

const CURSOR_MODEL_VALUES = new Set(['fast', 'inherit']);

const cursor: SubagentProviderDefinition = {
  id: 'cursor',
  name: 'Cursor',
  fileExtensions: ['.md'],
  globalDirs: () => [
    { id: 'cursor-global', name: 'Cursor', path: path.join(HOME, '.cursor', 'agents') },
  ],
  projectDirs: (projectPath, resolved) => [
    { id: `cursor-project-${projectPath}`, name: 'Cursor', path: path.join(resolved, '.cursor', 'agents') },
  ],
  lint: (meta, body) => {
    const f: SubagentLintFinding[] = [];

    if (meta.name != null && meta.name.trim() && !NAME_REGEX.test(meta.name)) {
      f.push(finding('name', 'error', 'name must contain only lowercase letters, numbers, and hyphens (no leading digit)'));
    }

    if (meta.model != null) {
      const m = String(meta.model);
      if (!CURSOR_MODEL_VALUES.has(m) && !m.includes('/') && !m.startsWith('claude-') && !m.startsWith('gpt-') && !m.startsWith('gemini-')) {
        f.push(finding('model', 'warning', `model "${m}" is not a recognized Cursor value (expected: fast, inherit, or a specific model ID)`));
      }
    }

    if (meta.readonly != null && typeof meta.readonly !== 'boolean') {
      f.push(finding('readonly', 'error', 'readonly must be a boolean'));
    }
    if (meta.background != null && typeof meta.background !== 'boolean') {
      f.push(finding('background', 'error', 'background must be a boolean'));
    }
    if (!body.trim()) {
      f.push(finding('body', 'warning', 'Subagent has no system prompt (markdown body is empty)'));
    }

    f.push(...warnForeignFields(meta, 'Cursor', {
      'Claude Code-only': ['permissionMode', 'maxTurns', 'memory', 'isolation', 'tools', 'disallowedTools', 'skills'],
      'OpenCode-only': ['mode', 'temperature', 'top_p', 'steps', 'disable', 'hidden', 'permission'],
      'VS Code-only': ['argument-hint', 'user-invocable', 'disable-model-invocation', 'target', 'agents', 'handoffs'],
    }));

    return f;
  },
};

// ── OpenCode ───────────────────────────────────────────────────────

const OPENCODE_MODE_VALUES = new Set(['subagent', 'primary', 'all']);
const OPENCODE_PERMISSION_VALUES = new Set(['ask', 'allow', 'deny']);

const opencode: SubagentProviderDefinition = {
  id: 'opencode',
  name: 'OpenCode',
  fileExtensions: ['.md'],
  globalDirs: () => [
    { id: 'opencode-global', name: 'OpenCode', path: path.join(HOME, '.config', 'opencode', 'agents') },
  ],
  projectDirs: (projectPath, resolved) => [
    { id: `opencode-project-${projectPath}`, name: 'OpenCode', path: path.join(resolved, '.opencode', 'agents') },
  ],
  lint: (meta, body) => {
    const f: SubagentLintFinding[] = [];

    if (!meta.description || typeof meta.description !== 'string' || !meta.description.trim()) {
      f.push(finding('description', 'error', 'description is required for OpenCode agents'));
    }
    if (meta.mode != null && !OPENCODE_MODE_VALUES.has(meta.mode)) {
      f.push(finding('mode', 'error', `mode must be one of: ${[...OPENCODE_MODE_VALUES].join(', ')}`));
    }
    if (meta.model != null && !String(meta.model).includes('/')) {
      f.push(finding('model', 'warning', `model "${meta.model}" should use provider/model-id format (e.g. anthropic/claude-sonnet-4-20250514)`));
    }
    if (meta.temperature != null && (typeof meta.temperature !== 'number' || meta.temperature < 0 || meta.temperature > 1)) {
      f.push(finding('temperature', 'error', 'temperature must be a number between 0.0 and 1.0'));
    }
    if (meta.top_p != null && (typeof meta.top_p !== 'number' || meta.top_p < 0 || meta.top_p > 1)) {
      f.push(finding('top_p', 'error', 'top_p must be a number between 0.0 and 1.0'));
    }
    if (meta.steps != null && (!Number.isInteger(meta.steps) || meta.steps < 1)) {
      f.push(finding('steps', 'error', 'steps must be a positive integer'));
    }
    if (meta.disable != null && typeof meta.disable !== 'boolean') {
      f.push(finding('disable', 'error', 'disable must be a boolean'));
    }
    if (meta.hidden != null && typeof meta.hidden !== 'boolean') {
      f.push(finding('hidden', 'error', 'hidden must be a boolean'));
    }
    if (meta.permission != null) {
      if (typeof meta.permission === 'string' && !OPENCODE_PERMISSION_VALUES.has(meta.permission)) {
        f.push(finding('permission', 'error', `permission string must be one of: ${[...OPENCODE_PERMISSION_VALUES].join(', ')}`));
      } else if (typeof meta.permission !== 'string' && typeof meta.permission !== 'object') {
        f.push(finding('permission', 'error', 'permission must be a string (ask/allow/deny) or an object'));
      }
    }
    if (meta.color != null && typeof meta.color !== 'string') {
      f.push(finding('color', 'error', 'color must be a string (hex color or theme color name)'));
    }
    if (meta.tools != null && Array.isArray(meta.tools)) {
      f.push(finding('tools', 'warning', 'OpenCode tools should be an object mapping tool names to booleans, not an array'));
    }
    if (!body.trim()) {
      f.push(finding('body', 'warning', 'Agent has no system prompt (markdown body is empty). Consider using the prompt field or adding markdown content.'));
    }

    f.push(...warnForeignFields(meta, 'OpenCode', {
      'Claude Code-only': ['permissionMode', 'maxTurns', 'memory', 'isolation', 'disallowedTools', 'skills', 'mcpServers', 'hooks'],
      'Cursor-only': ['readonly'],
      'VS Code-only': ['argument-hint', 'user-invocable', 'disable-model-invocation', 'target', 'agents', 'handoffs'],
    }));

    return f;
  },
};

// ── VS Code (Copilot) ──────────────────────────────────────────────

const vscode: SubagentProviderDefinition = {
  id: 'vscode',
  name: 'VS Code',
  fileExtensions: ['.md', '.agent.md'],
  globalDirs: () => [
    { id: 'vscode-global', name: 'VS Code (User)', path: path.join(HOME, '.copilot', 'agents') },
  ],
  projectDirs: (projectPath, resolved) => [
    { id: `vscode-project-${projectPath}`, name: 'VS Code (Workspace)', path: path.join(resolved, '.github', 'agents') },
  ],
  lint: (meta, body) => {
    const f: SubagentLintFinding[] = [];

    // name: optional (defaults to filename)
    // description: optional but recommended
    if (!meta.description || typeof meta.description !== 'string' || !meta.description.trim()) {
      f.push(finding('description', 'warning', 'description is recommended for VS Code agents (shown as placeholder text in chat)'));
    }

    // model: string or array (qualified names like "GPT-5.2 (copilot)")
    // We accept any string here since VS Code model names are free-form
    if (meta.model != null && typeof meta.model !== 'string' && !Array.isArray(meta.model)) {
      f.push(finding('model', 'error', 'model must be a string or array of strings (prioritized list)'));
    }

    // tools: array of strings
    if (meta.tools != null && !Array.isArray(meta.tools)) {
      f.push(finding('tools', 'error', 'tools must be an array of tool/toolset names'));
    }

    // agents: array of strings
    const agents = (meta as Record<string, unknown>)['agents'];
    if (agents != null && !Array.isArray(agents)) {
      f.push(finding('agents', 'error', 'agents must be an array of agent names (or ["*"] to allow all)'));
    }

    // user-invocable: boolean
    const userInvocable = (meta as Record<string, unknown>)['user-invocable'];
    if (userInvocable != null && typeof userInvocable !== 'boolean') {
      f.push(finding('user-invocable', 'error', 'user-invocable must be a boolean'));
    }

    // disable-model-invocation: boolean
    const disableModelInvocation = (meta as Record<string, unknown>)['disable-model-invocation'];
    if (disableModelInvocation != null && typeof disableModelInvocation !== 'boolean') {
      f.push(finding('disable-model-invocation', 'error', 'disable-model-invocation must be a boolean'));
    }

    // target: 'vscode' | 'github-copilot'
    const target = (meta as Record<string, unknown>)['target'];
    if (target != null && target !== 'vscode' && target !== 'github-copilot') {
      f.push(finding('target', 'error', 'target must be "vscode" or "github-copilot"'));
    }

    // argument-hint: string
    const argHint = (meta as Record<string, unknown>)['argument-hint'];
    if (argHint != null && typeof argHint !== 'string') {
      f.push(finding('argument-hint', 'error', 'argument-hint must be a string'));
    }

    // handoffs: array of objects
    const handoffs = (meta as Record<string, unknown>)['handoffs'];
    if (handoffs != null) {
      if (!Array.isArray(handoffs)) {
        f.push(finding('handoffs', 'error', 'handoffs must be an array'));
      } else {
        for (let i = 0; i < handoffs.length; i++) {
          const h = handoffs[i] as Record<string, unknown> | null;
          if (!h || typeof h !== 'object') {
            f.push(finding('handoffs', 'error', `handoffs[${i}] must be an object`));
          } else {
            if (!h.label || typeof h.label !== 'string') {
              f.push(finding('handoffs', 'error', `handoffs[${i}].label is required and must be a string`));
            }
            if (!h.agent || typeof h.agent !== 'string') {
              f.push(finding('handoffs', 'error', `handoffs[${i}].agent is required and must be a string`));
            }
          }
        }
      }
    }

    // hooks: object
    if (meta.hooks != null && typeof meta.hooks !== 'object') {
      f.push(finding('hooks', 'error', 'hooks must be an object'));
    }

    if (!body.trim()) {
      f.push(finding('body', 'warning', 'Agent has no system prompt (markdown body is empty)'));
    }

    f.push(...warnForeignFields(meta, 'VS Code', {
      'Claude Code-only': ['permissionMode', 'maxTurns', 'memory', 'isolation', 'disallowedTools', 'skills', 'background'],
      'Cursor-only': ['readonly'],
      'OpenCode-only': ['mode', 'temperature', 'top_p', 'steps', 'disable', 'hidden', 'permission', 'color'],
    }));

    return f;
  },
};

// ── Registry ───────────────────────────────────────────────────────

/** All registered subagent providers, in display order. */
export const SUBAGENT_PROVIDERS: SubagentProviderDefinition[] = [
  claude,
  cursor,
  opencode,
  vscode,
];

/** Provider IDs (convenience). */
export const SUBAGENT_PROVIDER_IDS = SUBAGENT_PROVIDERS.map((p) => p.id);

/** Look up a provider by ID. */
export function getSubagentProvider(id: string): SubagentProviderDefinition | undefined {
  return SUBAGENT_PROVIDERS.find((p) => p.id === id);
}
