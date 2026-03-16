import path from 'path';
import fs from 'fs';
import { parseSkillDir, parseSkillContent } from './parse.js';
import type { SkillMetadata } from './parse.js';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import type { LintFinding, LintReport } from '../types.js';

export type { LintFinding, LintReport };

/** Per https://agentskills.io/specification: lowercase letters, numbers, hyphens only */
const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function addFinding(
  findings: LintFinding[],
  field: string,
  level: LintFinding['level'],
  message: string,
  fixable = false
): void {
  findings.push({ field, file: 'SKILL.md', fixable, level, message });
}

/**
 * Run lint checks on parsed skill metadata and body.
 * dirName is optional; when provided, validates name matches parent directory.
 */
function runLintChecks(
  metadata: SkillMetadata,
  body: string,
  dirName?: string
): LintFinding[] {
  const findings: LintFinding[] = [];

  // name: required, 1-64 chars, lowercase alphanumeric + hyphens, no start/end hyphen, no consecutive hyphens
  if (!metadata.name || typeof metadata.name !== 'string') {
    addFinding(findings, 'name', 'error', 'name field is required');
  } else {
    const name = metadata.name.trim();
    if (name.length === 0) {
      addFinding(findings, 'name', 'error', 'name must not be empty');
    } else if (name.length > 64) {
      addFinding(findings, 'name', 'error', `name must be 64 characters or fewer (got ${name.length})`);
    } else if (!NAME_REGEX.test(name)) {
      addFinding(findings, 'name', 'error', 'name must contain only lowercase letters, numbers, and hyphens');
    } else if (name.startsWith('-') || name.endsWith('-')) {
      addFinding(findings, 'name', 'error', 'name must not start or end with a hyphen');
    } else if (name.includes('--')) {
      addFinding(findings, 'name', 'error', 'name must not contain consecutive hyphens');
    } else if (dirName !== undefined && dirName !== name) {
      addFinding(findings, 'name', 'warning', `name "${name}" does not match parent directory "${dirName}" (required by spec)`);
    }
  }

  // description: required, 1-1024 chars
  if (metadata.description == null || typeof metadata.description !== 'string') {
    addFinding(findings, 'description', 'error', 'description field is required');
  } else {
    const desc = metadata.description.trim();
    if (desc.length === 0) {
      addFinding(findings, 'description', 'error', 'description must not be empty');
    } else if (desc.length > 1024) {
      addFinding(findings, 'description', 'error', `description must be 1024 characters or fewer (got ${desc.length})`);
    }
  }

  // compatibility: optional, max 500 chars if provided
  if (metadata.compatibility != null && typeof metadata.compatibility === 'string') {
    const comp = metadata.compatibility.trim();
    if (comp.length > 500) {
      addFinding(findings, 'compatibility', 'error', `compatibility must be 500 characters or fewer (got ${comp.length})`);
    }
  }

  // metadata: optional, values must be strings
  if (metadata.metadata != null && typeof metadata.metadata === 'object') {
    for (const [k, v] of Object.entries(metadata.metadata)) {
      if (typeof v !== 'string') {
        addFinding(findings, 'metadata', 'error', `metadata.${k} must be a string value`);
      }
    }
  }

  // Body: recommend under 500 lines (progressive disclosure)
  const lines = body.split('\n').length;
  if (lines > 500) {
    addFinding(findings, 'body', 'warning', `SKILL.md body exceeds 500 lines (${lines}). Consider moving content to references/`);
  }

  return findings;
}

/**
 * Validate a skill directory against the agentskills.io specification.
 */
export async function lintSkill(skillPath: string): Promise<LintReport> {
  const resolved = resolvePath(skillPath);
  if (!isPathSafe(resolved)) {
    throw new Error('Path is not allowed');
  }

  const skillMdPath = path.join(resolved, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    throw new Error('SKILL.md not found');
  }

  const findings: LintFinding[] = [];
  const dirName = path.basename(resolved);

  try {
    const parsed = parseSkillDir(resolved);
    findings.push(...runLintChecks(parsed.metadata, parsed.body, dirName));
  } catch (err) {
    addFinding(findings, 'frontmatter', 'error', (err as Error).message);
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.filter((f) => f.level === 'warning').length;
  const infos = findings.filter((f) => f.level === 'info').length;

  return {
    files: 1,
    findings,
    errors,
    warnings,
    infos,
    fixed: 0,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate raw SKILL.md content against the agentskills.io specification.
 * dirName is optional; when provided, validates name matches parent directory.
 */
export function lintSkillContent(content: string, dirName?: string): LintReport {
  const findings: LintFinding[] = [];

  try {
    const parsed = parseSkillContent(content);
    findings.push(...runLintChecks(parsed.metadata, parsed.body, dirName));
  } catch (err) {
    addFinding(findings, 'frontmatter', 'error', (err as Error).message);
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.filter((f) => f.level === 'warning').length;
  const infos = findings.filter((f) => f.level === 'info').length;

  return {
    files: 1,
    findings,
    errors,
    warnings,
    infos,
    fixed: 0,
    generatedAt: new Date().toISOString(),
  };
}
