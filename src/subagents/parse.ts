import fs from 'fs';
import matter from 'gray-matter';

/**
 * Parsed frontmatter metadata from a subagent markdown file.
 *
 * Contains known fields across all providers. Provider-specific fields that
 * use hyphenated names (e.g. `argument-hint`) are accessed via bracket
 * notation or the raw `_raw` record.
 */
export interface SubagentMetadata {
  // ── Common ───────────────────────────────────────
  name?: string;
  description?: string;
  model?: unknown; // string | string[] (VS Code allows array)
  tools?: string[] | Record<string, unknown>;
  hooks?: unknown;

  // ── Claude Code ──────────────────────────────────
  disallowedTools?: string[];
  permissionMode?: string;
  maxTurns?: number;
  skills?: string[];
  mcpServers?: unknown;
  memory?: string;
  background?: boolean;
  isolation?: string;

  // ── Cursor ───────────────────────────────────────
  readonly?: boolean;

  // ── OpenCode ─────────────────────────────────────
  mode?: string;
  temperature?: number;
  top_p?: number;
  steps?: number;
  disable?: boolean;
  hidden?: boolean;
  permission?: unknown;
  color?: string;

  // ── VS Code ──────────────────────────────────────
  'argument-hint'?: string;
  'user-invocable'?: boolean;
  'disable-model-invocation'?: boolean;
  target?: string;
  agents?: string[];
  handoffs?: unknown[];

  /** Raw frontmatter record for accessing any field. */
  [key: string]: unknown;
}

export interface ParsedSubagent {
  metadata: SubagentMetadata;
  body: string;
}

/**
 * Parse a subagent .md file from disk.
 */
export function parseSubagentFile(filePath: string): ParsedSubagent {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Subagent file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseSubagentContent(raw);
}

/**
 * Parse raw subagent markdown content (YAML frontmatter + body).
 * Throws if frontmatter cannot be parsed (e.g. invalid YAML).
 */
export function parseSubagentContent(raw: string): ParsedSubagent {
  const parsed = matter(raw);
  // Pass through all frontmatter fields — individual provider lint
  // functions validate which fields they care about.
  const data = parsed.data as SubagentMetadata;
  return {
    metadata: data,
    body: parsed.content ?? '',
  };
}
