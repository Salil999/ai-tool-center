/**
 * Hook validator - validates hook configuration against provider rules.
 * Based on Anthropic's hook linter logic translated to TypeScript.
 */

import type { HookItem, HookProviderDefinition } from '../types.js';

export interface HookLintFinding {
  field: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  hookIndex?: number;
}

export interface HookLintReport {
  findings: HookLintFinding[];
  errors: number;
  warnings: number;
  infos: number;
  generatedAt: string;
}

function addFinding(
  findings: HookLintFinding[],
  field: string,
  level: HookLintFinding['level'],
  message: string,
  hookIndex?: number
): void {
  findings.push({ field, level, message, hookIndex });
}

/**
 * Validate a single hook against provider capabilities.
 */
function validateHook(
  hook: HookItem,
  provider: HookProviderDefinition,
  hookIndex: number,
  findings: HookLintFinding[]
): void {
  // Event validation
  if (!hook.event || typeof hook.event !== 'string') {
    addFinding(findings, 'event', 'error', 'event field is required', hookIndex);
  } else if (!provider.supportedEvents.includes(hook.event)) {
    addFinding(
      findings,
      'event',
      'error',
      `event "${hook.event}" is not supported by ${provider.name}. Supported: ${provider.supportedEvents.join(', ')}`,
      hookIndex
    );
  }

  // Type validation
  if (!hook.type || typeof hook.type !== 'string') {
    addFinding(findings, 'type', 'error', 'type field is required', hookIndex);
  } else if (!provider.supportedTypes.includes(hook.type)) {
    addFinding(
      findings,
      'type',
      'error',
      `type "${hook.type}" is not supported by ${provider.name}. Supported: ${provider.supportedTypes.join(', ')}`,
      hookIndex
    );
  }

  // Matcher validation
  if (hook.matcher !== undefined) {
    if (typeof hook.matcher !== 'string') {
      addFinding(findings, 'matcher', 'error', 'matcher must be a string', hookIndex);
    } else if (hook.event && !provider.matcherEvents.includes(hook.event)) {
      addFinding(
        findings,
        'matcher',
        'warning',
        `matcher is ignored for event "${hook.event}". Matcher is only meaningful for: ${provider.matcherEvents.join(', ')}`,
        hookIndex
      );
    } else {
      // Validate regex pattern
      try {
        new RegExp(hook.matcher);
      } catch {
        addFinding(findings, 'matcher', 'error', `matcher "${hook.matcher}" is not a valid regular expression`, hookIndex);
      }
    }
  }

  // Type-specific validation
  if (hook.type === 'command') {
    validateCommandHook(hook, hookIndex, findings);
  } else if (hook.type === 'http') {
    validateHttpHook(hook, hookIndex, findings);
  } else if (hook.type === 'prompt' || hook.type === 'agent') {
    validatePromptHook(hook, hookIndex, findings);
  }

  // Timeout validation
  if (hook.timeout !== undefined) {
    if (typeof hook.timeout !== 'number' || hook.timeout < 0) {
      addFinding(findings, 'timeout', 'error', 'timeout must be a non-negative number', hookIndex);
    } else if (provider.id === 'vscode') {
      if (hook.timeout > 300) {
        addFinding(findings, 'timeout', 'warning', 'timeout exceeds 5 minutes (300s) — hooks may be killed by VS Code', hookIndex);
      }
    } else if (hook.timeout > 300000) {
      addFinding(findings, 'timeout', 'warning', 'timeout exceeds 5 minutes (300000ms) — hooks may be killed by the provider', hookIndex);
    }
  }

  // VS Code-specific validation
  if (provider.id === 'vscode') {
    if (hook.windows !== undefined && typeof hook.windows !== 'string') {
      addFinding(findings, 'windows', 'error', 'windows must be a string', hookIndex);
    }
    if (hook.linux !== undefined && typeof hook.linux !== 'string') {
      addFinding(findings, 'linux', 'error', 'linux must be a string', hookIndex);
    }
    if (hook.osx !== undefined && typeof hook.osx !== 'string') {
      addFinding(findings, 'osx', 'error', 'osx must be a string', hookIndex);
    }
    if (hook.cwd !== undefined && typeof hook.cwd !== 'string') {
      addFinding(findings, 'cwd', 'error', 'cwd must be a string', hookIndex);
    }
    if (hook.env !== undefined) {
      if (typeof hook.env !== 'object' || Array.isArray(hook.env)) {
        addFinding(findings, 'env', 'error', 'env must be an object', hookIndex);
      } else {
        for (const [key, value] of Object.entries(hook.env)) {
          if (typeof value !== 'string') {
            addFinding(findings, 'env', 'error', `env.${key} must be a string`, hookIndex);
          }
        }
      }
    }
  }

  // Optional fields validation
  if (hook.async !== undefined && typeof hook.async !== 'boolean') {
    addFinding(findings, 'async', 'error', 'async must be a boolean', hookIndex);
  }
  if (hook.statusMessage !== undefined && typeof hook.statusMessage !== 'string') {
    addFinding(findings, 'statusMessage', 'error', 'statusMessage must be a string', hookIndex);
  }
  if (hook.failClosed !== undefined && typeof hook.failClosed !== 'boolean') {
    addFinding(findings, 'failClosed', 'error', 'failClosed must be a boolean', hookIndex);
  }
  if (hook.loopLimit !== undefined && hook.loopLimit !== null && typeof hook.loopLimit !== 'number') {
    addFinding(findings, 'loopLimit', 'error', 'loopLimit must be a number or null', hookIndex);
  }
}

/**
 * Validate command-type hooks.
 */
function validateCommandHook(hook: HookItem, hookIndex: number, findings: HookLintFinding[]): void {
  if (!hook.command || typeof hook.command !== 'string') {
    addFinding(findings, 'command', 'error', 'command field is required for type "command"', hookIndex);
    return;
  }

  const cmd = hook.command.trim();
  if (cmd.length === 0) {
    addFinding(findings, 'command', 'error', 'command must not be empty', hookIndex);
    return;
  }

  // Check for common shell command patterns that indicate proper scripting
  const hasShebang = cmd.startsWith('#!');
  const hasSetE = /set -[euo]/.test(cmd);
  const hasQuotedVars = /"\$[A-Z_][A-Z0-9_]*"/.test(cmd);

  if (!hasShebang && cmd.includes('\n')) {
    addFinding(
      findings,
      'command',
      'warning',
      'Multi-line shell script missing shebang declaration (#!/bin/bash)',
      hookIndex
    );
  }

  if (cmd.includes('\n') && !hasSetE) {
    addFinding(
      findings,
      'command',
      'info',
      'Consider adding "set -euo pipefail" for safer script execution',
      hookIndex
    );
  }

  // Check for unquoted variable references (potential injection risk)
  const unquotedVarPattern = /(?<!")(\$[A-Z_][A-Z0-9_]*)(?!")/g;
  if (unquotedVarPattern.test(cmd) && !hasQuotedVars) {
    addFinding(
      findings,
      'command',
      'warning',
      'Unquoted variable references pose injection risks. Quote variables: "$VAR"',
      hookIndex
    );
  }

  // Check for hardcoded paths
  if (/\/home\/|\/Users\//.test(cmd)) {
    addFinding(
      findings,
      'command',
      'info',
      'Consider using environment variables ($CLAUDE_PROJECT_DIR, $CLAUDE_PLUGIN_ROOT) instead of hardcoded paths',
      hookIndex
    );
  }

  // Check for stdin reading (important for PreToolUse, etc.)
  const hasStdinRead = /\b(cat|read)\b/.test(cmd);
  const hasJq = /\bjq\b/.test(cmd);

  if (!hasStdinRead && hook.event && ['PreToolUse', 'PostToolUse', 'PermissionRequest'].includes(hook.event)) {
    addFinding(
      findings,
      'command',
      'info',
      `Event "${hook.event}" provides JSON input on stdin. Consider reading it with "cat" or "read"`,
      hookIndex
    );
  }

  if (hasStdinRead && !hasJq && cmd.includes('{') && cmd.includes('}')) {
    addFinding(
      findings,
      'command',
      'info',
      'Script appears to parse JSON input but does not use "jq". Consider using jq for safer JSON parsing',
      hookIndex
    );
  }

  // Check for dangerous patterns
  if (/rm -rf|dd if=|mkfs|format/.test(cmd)) {
    addFinding(
      findings,
      'command',
      'warning',
      'Command contains potentially destructive operations (rm -rf, dd, mkfs)',
      hookIndex
    );
  }

  // Check for long sleeps or infinite loops
  if (/sleep\s+[5-9]\d{2,}|while\s+true/.test(cmd)) {
    addFinding(
      findings,
      'command',
      'warning',
      'Command contains long sleeps or infinite loops that may exceed timeout',
      hookIndex
    );
  }

  // Check for stderr redirection
  if (cmd.includes('echo') && !/>2/.test(cmd)) {
    addFinding(
      findings,
      'command',
      'info',
      'Error messages should be sent to stderr using ">&2" for proper logging',
      hookIndex
    );
  }

  // Check for exit codes
  if (hook.event === 'PreToolUse' && !/exit [02]/.test(cmd)) {
    addFinding(
      findings,
      'command',
      'info',
      'PreToolUse hooks should explicitly exit with 0 (allow) or 2 (deny)',
      hookIndex
    );
  }
}

/**
 * Validate HTTP-type hooks.
 */
function validateHttpHook(hook: HookItem, hookIndex: number, findings: HookLintFinding[]): void {
  if (!hook.url || typeof hook.url !== 'string') {
    addFinding(findings, 'url', 'error', 'url field is required for type "http"', hookIndex);
    return;
  }

  const url = hook.url.trim();
  if (url.length === 0) {
    addFinding(findings, 'url', 'error', 'url must not be empty', hookIndex);
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    addFinding(findings, 'url', 'error', `url "${url}" is not a valid URL`, hookIndex);
    return;
  }

  // Check protocol
  const urlObj = new URL(url);
  if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
    addFinding(findings, 'url', 'error', `url protocol must be http or https, got "${urlObj.protocol}"`, hookIndex);
  } else if (urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
    addFinding(
      findings,
      'url',
      'warning',
      'Using unencrypted HTTP for remote endpoints is insecure. Use HTTPS instead',
      hookIndex
    );
  }

  // Validate headers
  if (hook.headers !== undefined) {
    if (typeof hook.headers !== 'object' || Array.isArray(hook.headers)) {
      addFinding(findings, 'headers', 'error', 'headers must be an object', hookIndex);
    } else {
      for (const [key, value] of Object.entries(hook.headers)) {
        if (typeof value !== 'string') {
          addFinding(findings, 'headers', 'error', `header "${key}" must be a string value`, hookIndex);
        }
      }
    }
  }
}

/**
 * Validate prompt/agent-type hooks.
 */
function validatePromptHook(hook: HookItem, hookIndex: number, findings: HookLintFinding[]): void {
  if (!hook.prompt || typeof hook.prompt !== 'string') {
    addFinding(findings, 'prompt', 'error', `prompt field is required for type "${hook.type}"`, hookIndex);
    return;
  }

  const prompt = hook.prompt.trim();
  if (prompt.length === 0) {
    addFinding(findings, 'prompt', 'error', 'prompt must not be empty', hookIndex);
    return;
  }

  // Check for $ARGUMENTS placeholder
  if (hook.event && ['PreToolUse', 'PostToolUse', 'PermissionRequest'].includes(hook.event)) {
    if (!prompt.includes('$ARGUMENTS')) {
      addFinding(
        findings,
        'prompt',
        'info',
        `Event "${hook.event}" provides context data. Consider using $ARGUMENTS to include it in your prompt`,
        hookIndex
      );
    }
  }

  // Validate model field
  if (hook.model !== undefined && typeof hook.model !== 'string') {
    addFinding(findings, 'model', 'error', 'model must be a string', hookIndex);
  }

  // Warn if prompt is very long
  if (prompt.length > 2000) {
    addFinding(
      findings,
      'prompt',
      'warning',
      `prompt is very long (${prompt.length} chars). Consider using a command-type hook with a script instead`,
      hookIndex
    );
  }
}

/**
 * Validate an array of hooks against provider capabilities.
 */
export function lintHooks(
  hooks: HookItem[],
  provider: HookProviderDefinition
): HookLintReport {
  const findings: HookLintFinding[] = [];

  if (!Array.isArray(hooks)) {
    addFinding(findings, 'root', 'error', 'hooks must be an array');
  } else {
    hooks.forEach((hook, index) => {
      if (!hook || typeof hook !== 'object') {
        addFinding(findings, 'hook', 'error', 'each hook must be an object', index);
      } else {
        validateHook(hook, provider, index, findings);
      }
    });
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.filter((f) => f.level === 'warning').length;
  const infos = findings.filter((f) => f.level === 'info').length;

  return {
    findings,
    errors,
    warnings,
    infos,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Parse and validate raw JSON hook configuration.
 */
export function lintRawHookConfig(
  rawJson: string,
  provider: HookProviderDefinition
): HookLintReport {
  const findings: HookLintFinding[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    addFinding(findings, 'json', 'error', `Invalid JSON: ${(err as Error).message}`);
    return {
      findings,
      errors: 1,
      warnings: 0,
      infos: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  if (!Array.isArray(parsed)) {
    addFinding(findings, 'root', 'error', 'hooks configuration must be a JSON array');
    return {
      findings,
      errors: 1,
      warnings: 0,
      infos: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  return lintHooks(parsed as HookItem[], provider);
}
