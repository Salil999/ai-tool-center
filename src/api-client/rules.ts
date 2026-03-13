import { fetchJSON, apiUrl } from './fetch';
import type { ProviderRule } from '@/types';

export type { ProviderRule };

export async function getRuleProviders() {
  return fetchJSON<Array<{ id: string; name: string }>>(apiUrl('/rules/providers'));
}

export async function getProviderRules(providerId: string) {
  return fetchJSON<ProviderRule[]>(apiUrl(`/rules/providers/${providerId}/rules`));
}

export async function getProviderRuleContent(providerId: string, ruleId: string) {
  return fetchJSON<{ content: string }>(apiUrl(`/rules/providers/${providerId}/rules/${ruleId}/content`));
}

export async function saveProviderRuleContent(providerId: string, ruleId: string, content: string) {
  return fetchJSON<{ success: boolean }>(apiUrl(`/rules/providers/${providerId}/rules/${ruleId}/content`), {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function createProviderRule(providerId: string, name: string, content?: string) {
  return fetchJSON<ProviderRule>(apiUrl(`/rules/providers/${providerId}/rules`), {
    method: 'POST',
    body: JSON.stringify({ name, content: content ?? '' }),
  });
}

export async function deleteProviderRule(providerId: string, ruleId: string) {
  await fetch(apiUrl(`/rules/providers/${providerId}/rules/${ruleId}`), { method: 'DELETE' });
}

export async function reorderProviderRules(providerId: string, order: string[]) {
  return fetchJSON<{ order: string[] }>(apiUrl(`/rules/providers/${providerId}/rules/reorder`), {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function getAgentRules() {
  return fetchJSON<Array<{ id: string; projectPath: string; name?: string }>>(apiUrl('/rules/agents'));
}

export async function createAgentRule(projectPath: string, name?: string, content?: string) {
  return fetchJSON<{ id: string; projectPath: string; name?: string }>(apiUrl('/rules/agents'), {
    method: 'POST',
    body: JSON.stringify({ projectPath, name, content: content ?? '' }),
  });
}

export async function getAgentsForAgent(agentId: string) {
  return fetchJSON<{ content: string }>(apiUrl(`/rules/agents/${agentId}/content`));
}

export async function saveAgentsForAgent(agentId: string, content: string) {
  return fetchJSON<{ success: boolean }>(apiUrl(`/rules/agents/${agentId}/content`), {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function deleteAgentRule(agentId: string) {
  await fetch(apiUrl(`/rules/agents/${agentId}`), { method: 'DELETE' });
}

export async function getCustomRuleConfigs() {
  return fetchJSON<Array<{ id: string; name: string; path: string; type: 'file' | 'directory'; extension?: '.md' | '.mdc' }>>(
    apiUrl('/rules/custom-configs')
  );
}

export async function createCustomRuleConfig(
  name: string,
  path: string,
  type: 'file' | 'directory',
  extension?: '.md' | '.mdc'
) {
  return fetchJSON<{ id: string; name: string; path: string; type: 'file' | 'directory'; extension?: '.md' | '.mdc' }>(
    apiUrl('/rules/custom-configs'),
    {
      method: 'POST',
      body: JSON.stringify({ name, path, type, extension: extension ?? '.md' }),
    }
  );
}

export async function deleteCustomRuleConfig(configId: string) {
  await fetch(apiUrl(`/rules/custom-configs/${configId}`), { method: 'DELETE' });
}

export async function getRuleSyncTargets() {
  return fetchJSON<{
    providers: Array<{ id: string; name: string; path: string }>;
    projects: Array<{ id: string; name: string; path: string }>;
  }>(apiUrl('/rules/sync/targets'));
}

export async function syncRulesTo(target: string, sourceAgentId?: string) {
  const base = apiUrl(`/rules/sync/${target}`);
  const url = new URL(base, window.location.origin);
  if (sourceAgentId) url.searchParams.set('sourceAgentId', sourceAgentId);
  return fetchJSON<{ path: string; success: boolean; syncedCount?: number }>(url.toString(), {
    method: 'POST',
  });
}

export async function syncRulesToProject(
  agentId: string,
  options?: { providerId?: string; sourceAgentId?: string }
) {
  const base = apiUrl(`/rules/sync/project/${agentId}`);
  const url = new URL(base, window.location.origin);
  if (options?.providerId) url.searchParams.set('providerId', options.providerId);
  if (options?.sourceAgentId) url.searchParams.set('sourceAgentId', options.sourceAgentId);
  return fetchJSON<{ path: string; success: boolean; syncedCount?: number }>(url.toString(), {
    method: 'POST',
  });
}

export async function getRuleImportSources() {
  return fetchJSON<
    Array<{ id: string; name: string; path: string; exists: boolean; hasContent: boolean; error?: string }>
  >(apiUrl('/rules/import/sources'));
}

export async function importRulesFromSource(sourceId: string, targetAgentId: string) {
  return fetchJSON<{ success: boolean }>(apiUrl(`/rules/import/${encodeURIComponent(sourceId)}`), {
    method: 'POST',
    body: JSON.stringify({ targetAgentId }),
  });
}

/** Import from Cursor or Augment into that provider's Rules section. No AGENTS.md needed. */
export async function importRulesFromProvider(sourceId: string) {
  return fetchJSON<{ success: boolean; importedCount?: number }>(
    apiUrl(`/rules/import/${encodeURIComponent(sourceId)}/provider`),
    { method: 'POST' }
  );
}

export async function importRulesFromCustomPath(filePath: string, targetAgentId: string) {
  return fetchJSON<{ success: boolean }>(apiUrl('/rules/import/custom'), {
    method: 'POST',
    body: JSON.stringify({ path: filePath, targetAgentId }),
  });
}
