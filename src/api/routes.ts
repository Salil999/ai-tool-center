/**
 * Route barrel — assembles all API routes into a single MountedRoute array.
 * Centralises route wiring so server.ts and test helpers share one source of truth.
 */
import { createServersRouter } from './servers.js';
import { createSyncRouter } from './sync.js';
import { createConfigRouter } from './config.js';
import { createImportRouter } from './import.js';
import { createOAuthRouter } from './oauth.js';
import { createSkillsRouter } from './skills.js';
import { createSkillsSyncRouter } from './skills-sync.js';
import { createSkillsImportRouter } from './skills-import.js';
import { createSkillsRegistryRouter } from './skills-registry.js';
import { createRulesRouter } from './rules.js';
import { createRulesSyncRouter } from './rules-sync.js';
import { createRulesImportRouter } from './rules-import.js';
import { createAgentsImportRouter } from './agents-import.js';
import { createAgentsRouter } from './agents.js';
import { createCustomRuleConfigsRouter } from './custom-rule-configs.js';
import { createProjectDirectoriesRouter } from './project-directories.js';
import { createProvidersRouter } from './providers.js';
import { createCredentialsRouter } from './credentials.js';
import { createSettingsRouter } from './settings.js';
import { createHooksRouter } from './hooks.js';
import { createPluginsRouter } from './plugins.js';
import { createSubagentsRouter } from './subagents.js';
import { createSubagentsImportRouter } from './subagents-import.js';
import { createSubagentsSyncRouter } from './subagents-sync.js';
import type { MountedRoute } from '../router.js';
import type { GetConfig, SaveConfig } from '../types.js';

export interface CreateRoutesOptions {
  getConfig: GetConfig;
  saveConfig: SaveConfig;
  baseUrl: string;
}

export function createAllRoutes(options: CreateRoutesOptions): MountedRoute[] {
  const { getConfig, saveConfig, baseUrl } = options;

  return [
    { prefix: '/api/servers', router: createServersRouter(getConfig, saveConfig, baseUrl) },
    { prefix: '/api/sync', router: createSyncRouter(getConfig) },
    { prefix: '/api/skills/sync', router: createSkillsSyncRouter(getConfig) },
    { prefix: '/api/skills/import', router: createSkillsImportRouter(getConfig, saveConfig) },
    { prefix: '/api/skills/registry', router: createSkillsRegistryRouter(getConfig, saveConfig) },
    { prefix: '/api/skills', router: createSkillsRouter(getConfig, saveConfig) },
    { prefix: '/api/rules/sync', router: createRulesSyncRouter(getConfig) },
    { prefix: '/api/rules/import', router: createRulesImportRouter(getConfig, saveConfig) },
    { prefix: '/api/rules/agents/import', router: createAgentsImportRouter(getConfig, saveConfig) },
    { prefix: '/api/rules/agents', router: createAgentsRouter(getConfig, saveConfig) },
    { prefix: '/api/rules/custom-configs', router: createCustomRuleConfigsRouter(getConfig, saveConfig) },
    { prefix: '/api/rules', router: createRulesRouter(getConfig, saveConfig) },
    { prefix: '/api/project-directories', router: createProjectDirectoriesRouter(getConfig, saveConfig) },
    { prefix: '/api/providers', router: createProvidersRouter(getConfig, saveConfig) },
    { prefix: '/api/credentials', router: createCredentialsRouter(getConfig) },
    { prefix: '/api/hooks', router: createHooksRouter(getConfig) },
    { prefix: '/api/plugins', router: createPluginsRouter() },
    { prefix: '/api/subagents/sync', router: createSubagentsSyncRouter(getConfig) },
    { prefix: '/api/subagents/import', router: createSubagentsImportRouter(getConfig, saveConfig) },
    { prefix: '/api/subagents', router: createSubagentsRouter(getConfig, saveConfig) },
    { prefix: '/api/config', router: createConfigRouter(getConfig, saveConfig) },
    { prefix: '/api/import', router: createImportRouter(getConfig, saveConfig) },
    { prefix: '/api/settings', router: createSettingsRouter(getConfig, saveConfig) },
    { prefix: '/oauth', router: createOAuthRouter(baseUrl) },
  ];
}
