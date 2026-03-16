import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { isPathSafe } from '../providers/utils.js';

export interface RuleLintFinding {
  field: string;
  file: string;
  fixable: boolean;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface RuleLintReport {
  findings: RuleLintFinding[];
  errors: number;
  warnings: number;
  infos: number;
  generatedAt: string;
}

/** Known Cursor .mdc frontmatter fields */
const KNOWN_CURSOR_FIELDS = new Set([
  'description',
  'globs',
  'alwaysApply',
]);

function addFinding(
  findings: RuleLintFinding[],
  field: string,
  level: RuleLintFinding['level'],
  message: string,
  file = 'rule.mdc',
  fixable = false
): void {
  findings.push({ field, file, fixable, level, message });
}

/**
 * Validate parsed Cursor rule frontmatter and body.
 */
function runCursorRuleLintChecks(
  frontmatter: Record<string, unknown>,
  body: string,
  fileName?: string
): RuleLintFinding[] {
  const findings: RuleLintFinding[] = [];
  const file = fileName ?? 'rule.mdc';

  // Check for unknown frontmatter fields
  for (const key of Object.keys(frontmatter)) {
    if (!KNOWN_CURSOR_FIELDS.has(key)) {
      addFinding(findings, key, 'warning', `Unknown frontmatter field "${key}". Known fields: description, globs, alwaysApply`, file);
    }
  }

  // description: optional but recommended, must be string, max 500 chars
  if (frontmatter.description !== undefined) {
    if (typeof frontmatter.description !== 'string') {
      addFinding(findings, 'description', 'error', 'description must be a string', file);
    } else if (frontmatter.description.length > 500) {
      addFinding(findings, 'description', 'warning', `description is very long (${frontmatter.description.length} chars). Consider keeping it under 500 characters`, file);
    }
  } else {
    addFinding(findings, 'description', 'info', 'No description provided. Adding a description helps Cursor understand when to apply this rule', file);
  }

  // globs: optional, must be string or array of strings
  if (frontmatter.globs !== undefined) {
    if (typeof frontmatter.globs === 'string') {
      if (frontmatter.globs.trim().length === 0) {
        addFinding(findings, 'globs', 'warning', 'globs is empty. Remove it or specify file patterns', file);
      }
    } else if (Array.isArray(frontmatter.globs)) {
      for (let i = 0; i < frontmatter.globs.length; i++) {
        if (typeof frontmatter.globs[i] !== 'string') {
          addFinding(findings, 'globs', 'error', `globs[${i}] must be a string`, file);
        }
      }
      if (frontmatter.globs.length === 0) {
        addFinding(findings, 'globs', 'warning', 'globs array is empty. Remove it or specify file patterns', file);
      }
    } else {
      addFinding(findings, 'globs', 'error', 'globs must be a string or array of strings (e.g. "**/*.ts" or ["*.ts", "*.tsx"])', file);
    }
  }

  // alwaysApply: optional, must be boolean
  if (frontmatter.alwaysApply !== undefined) {
    if (typeof frontmatter.alwaysApply !== 'boolean') {
      addFinding(findings, 'alwaysApply', 'error', 'alwaysApply must be a boolean (true or false)', file, true);
    }
  }

  // If neither globs nor alwaysApply is set, the rule may never trigger
  if (frontmatter.globs === undefined && frontmatter.alwaysApply === undefined) {
    addFinding(findings, 'alwaysApply', 'warning', 'Neither globs nor alwaysApply is set. This rule will only be applied when manually referenced. Set alwaysApply: true or specify globs', file);
  }

  // If alwaysApply is true and globs is also set, globs is ignored
  if (frontmatter.alwaysApply === true && frontmatter.globs !== undefined) {
    addFinding(findings, 'globs', 'info', 'globs is ignored when alwaysApply is true', file);
  }

  // Body checks
  if (!body || body.trim().length === 0) {
    addFinding(findings, 'body', 'error', 'Rule body is empty. Add instructions for the AI', file);
  } else {
    const lines = body.split('\n').length;
    if (lines > 500) {
      addFinding(findings, 'body', 'warning', `Rule body is very long (${lines} lines). Consider splitting into multiple rules`, file);
    }
  }

  return findings;
}

function buildReport(findings: RuleLintFinding[]): RuleLintReport {
  return {
    findings,
    errors: findings.filter((f) => f.level === 'error').length,
    warnings: findings.filter((f) => f.level === 'warning').length,
    infos: findings.filter((f) => f.level === 'info').length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Lint a Cursor rule file on disk.
 */
export function lintProviderRule(filePath: string): RuleLintReport {
  const resolved = path.resolve(filePath);
  if (!isPathSafe(resolved)) {
    throw new Error('Path is not allowed');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error('Rule file not found');
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const fileName = path.basename(resolved);
  return lintRuleContent(raw, fileName);
}

/**
 * Lint raw Cursor rule content (frontmatter + body).
 */
export function lintRuleContent(content: string, fileName?: string): RuleLintReport {
  const findings: RuleLintFinding[] = [];
  const file = fileName ?? 'rule.mdc';

  try {
    const parsed = matter(content);
    const frontmatter = parsed.data as Record<string, unknown>;
    const body = parsed.content ?? '';

    // Check if frontmatter exists at all
    const hasFrontmatter = content.trimStart().startsWith('---');
    if (!hasFrontmatter) {
      addFinding(findings, 'frontmatter', 'warning', 'No YAML frontmatter found. Cursor rules use frontmatter for description, globs, and alwaysApply', file);
    }

    findings.push(...runCursorRuleLintChecks(frontmatter, body, file));
  } catch (err) {
    addFinding(findings, 'frontmatter', 'error', `Invalid YAML frontmatter: ${(err as Error).message}`, file);
  }

  return buildReport(findings);
}
