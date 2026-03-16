import { parseSubagentContent, parseSubagentFile } from './parse.js';
import { SUBAGENT_PROVIDERS, getSubagentProvider } from './providers.js';
import type { SubagentLintFinding, SubagentLintReport } from '../types.js';

function buildReport(findings: SubagentLintFinding[]): SubagentLintReport {
  return {
    findings,
    errors: findings.filter((f) => f.level === 'error').length,
    warnings: findings.filter((f) => f.level === 'warning').length,
    infos: findings.filter((f) => f.level === 'info').length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate subagent content for a specific provider.
 */
export function lintSubagentContent(content: string, providerId: string): SubagentLintReport {
  const provider = getSubagentProvider(providerId);
  if (!provider) return buildReport([{ field: 'provider', level: 'error', message: `Unknown provider: ${providerId}` }]);
  try {
    const parsed = parseSubagentContent(content);
    return buildReport(provider.lint(parsed.metadata, parsed.body));
  } catch (err) {
    return buildReport([{ field: 'frontmatter', level: 'error', message: (err as Error).message }]);
  }
}

/**
 * Validate a subagent file from disk for a specific provider.
 */
export function lintSubagentFile(filePath: string, providerId: string): SubagentLintReport {
  const provider = getSubagentProvider(providerId);
  if (!provider) return buildReport([{ field: 'provider', level: 'error', message: `Unknown provider: ${providerId}` }]);
  try {
    const parsed = parseSubagentFile(filePath);
    return buildReport(provider.lint(parsed.metadata, parsed.body));
  } catch (err) {
    return buildReport([{ field: 'frontmatter', level: 'error', message: (err as Error).message }]);
  }
}

/**
 * Validate subagent content for ALL registered providers.
 * Returns a record keyed by provider ID.
 */
export function lintSubagentContentAllProviders(content: string): Record<string, SubagentLintReport> {
  const result: Record<string, SubagentLintReport> = {};
  for (const provider of SUBAGENT_PROVIDERS) {
    result[provider.id] = lintSubagentContent(content, provider.id);
  }
  return result;
}
