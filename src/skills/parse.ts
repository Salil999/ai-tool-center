import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface SkillMetadata {
  name: string;
  description?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string;
}

export interface ParsedSkill {
  metadata: SkillMetadata;
  body: string;
  location: string;
}

const SKILL_FILENAME = 'SKILL.md';

/**
 * Validate that a directory contains a SKILL.md file.
 */
export function validateSkillDir(dirPath: string): boolean {
  const skillPath = path.join(dirPath, SKILL_FILENAME);
  return fs.existsSync(skillPath) && fs.statSync(skillPath).isFile();
}

/**
 * Parse SKILL.md file: extract YAML frontmatter and body.
 */
function parseSkillMd(filePath: string): ParsedSkill {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SKILL.md not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = matter(raw);
  const metadata = parsed.data as Record<string, unknown>;
  return {
    metadata: {
      name: String(metadata.name ?? ''),
      description: metadata.description != null ? String(metadata.description) : undefined,
      license: metadata.license != null ? String(metadata.license) : undefined,
      compatibility: metadata.compatibility != null ? String(metadata.compatibility) : undefined,
      metadata: metadata.metadata as Record<string, string> | undefined,
      'allowed-tools': metadata['allowed-tools'] != null ? String(metadata['allowed-tools']) : undefined,
    },
    body: parsed.content ?? '',
    location: resolved,
  };
}

/**
 * Parse skill from directory path (assumes SKILL.md inside).
 */
export function parseSkillDir(dirPath: string): ParsedSkill {
  const skillPath = path.join(path.resolve(dirPath), SKILL_FILENAME);
  return parseSkillMd(skillPath);
}

/**
 * Parse skill from raw SKILL.md content string.
 */
export function parseSkillContent(raw: string): Omit<ParsedSkill, 'location'> {
  const parsed = matter(raw);
  const metadata = parsed.data as Record<string, unknown>;
  return {
    metadata: {
      name: String(metadata.name ?? ''),
      description: metadata.description != null ? String(metadata.description) : undefined,
      license: metadata.license != null ? String(metadata.license) : undefined,
      compatibility: metadata.compatibility != null ? String(metadata.compatibility) : undefined,
      metadata: metadata.metadata as Record<string, string> | undefined,
      'allowed-tools': metadata['allowed-tools'] != null ? String(metadata['allowed-tools']) : undefined,
    },
    body: parsed.content ?? '',
  };
}
