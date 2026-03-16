import { PROVIDERS } from './index.js';
import type { AppConfig } from '../types.js';

/**
 * Unified provider capability definition.
 * Each entry declares what a provider supports so we don't need
 * separate lists in rules/providers.ts, skills/providers.ts, and here.
 */
export interface ProviderCapabilities {
  id: string;
  name: string;
  /** Provider supports MCP server import/export (appears in PROVIDERS array). */
  mcp: boolean;
  /** Provider supports skills sync. Path to skills directory. */
  skillsPath?: string;
  /** Provider supports rules sync. Path and type of rules target. */
  rulesTarget?: {
    path: string;
    type: 'file' | 'directory';
  };
}

/**
 * Build the unified capabilities list from PROVIDERS + standalone entries.
 * Standalone entries are providers that don't have MCP import/export but
 * do support rules or skills sync.
 */
function buildCapabilities(): ProviderCapabilities[] {
  const caps: ProviderCapabilities[] = [];

  // MCP providers — derive capabilities from the Provider interface
  for (const p of PROVIDERS) {
    const rulesPath = p.getRulesPath?.();
    caps.push({
      id: p.id,
      name: p.name,
      mcp: true,
      skillsPath: p.getSkillsPath?.(),
      rulesTarget: rulesPath
        ? { path: rulesPath, type: rulesPath.endsWith('.md') ? 'file' : 'directory' }
        : undefined,
    });
  }

  return caps;
}

/** All provider capabilities (MCP + standalone). */
export const PROVIDER_CAPABILITIES = buildCapabilities();

/** All builtin MCP provider IDs (from PROVIDERS array). */
export const ALL_BUILTIN_IDS = PROVIDERS.map((p) => p.id);

/** Standalone provider IDs (not in PROVIDERS). */
export const STANDALONE_IDS = PROVIDER_CAPABILITIES.filter((p) => !p.mcp).map((p) => p.id);

/** All builtin provider IDs (MCP + standalone). */
export const ALL_PROVIDER_IDS = PROVIDER_CAPABILITIES.map((p) => p.id);

/** Get providers that support skills sync. */
export function getSkillCapableProviders(): ProviderCapabilities[] {
  return PROVIDER_CAPABILITIES.filter((p) => p.skillsPath);
}

/** Get providers that support rules sync. */
export function getRuleCapableProviders(): ProviderCapabilities[] {
  return PROVIDER_CAPABILITIES.filter((p) => p.rulesTarget);
}

const SUPPORTED_PROVIDER_IDS = new Set(['cursor', 'claude', 'vscode', 'opencode']);

/**
 * Get the list of enabled provider IDs.
 * When absent, all builtin providers are enabled (backward compatible).
 * Filters to only supported builtin providers (custom providers are no longer supported).
 */
export function getEnabledProviderIds(config: AppConfig): string[] {
  const explicit = config.enabledProviders;
  if (explicit && explicit.length > 0) {
    return explicit.filter((id) => SUPPORTED_PROVIDER_IDS.has(id));
  }
  return [...ALL_PROVIDER_IDS];
}

/** Check if a provider is enabled */
export function isProviderEnabled(id: string, config: AppConfig): boolean {
  const enabled = getEnabledProviderIds(config);
  return enabled.includes(id);
}
