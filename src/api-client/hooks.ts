import { fetchJSON, apiUrl } from './fetch';
import type { HookItem, HookLintReport } from '@/types';

export type Hook = HookItem & { id: string };

export interface HookProviderMeta {
  id: string;
  name: string;
  supportedEvents: string[];
  matcherEvents: string[];
  supportedTypes: HookItem['type'][];
  supportsProjectScope: boolean;
  supportsProjectLocalScope: boolean;
  supportsGlobalScope: boolean;
  userSettingsPath: string;
}

export type HookScope =
  | { type: 'global' }
  | { type: 'project'; projectId: string }
  | { type: 'projectLocal'; projectId: string };

function scopeBase(providerId: string, scope: HookScope): string {
  const base = apiUrl(`/hooks/${encodeURIComponent(providerId)}`);
  if (scope.type === 'global') return `${base}/global`;
  if (scope.type === 'projectLocal') {
    return `${base}/project/${encodeURIComponent(scope.projectId)}/local`;
  }
  return `${base}/project/${encodeURIComponent(scope.projectId)}`;
}

export async function getHookProvidersMeta() {
  return fetchJSON<HookProviderMeta[]>(apiUrl('/hooks/meta'));
}

export async function getHooks(providerId: string, scope: HookScope) {
  return fetchJSON<Hook[]>(scopeBase(providerId, scope));
}

export async function createHook(providerId: string, scope: HookScope, item: HookItem) {
  return fetchJSON<Hook>(scopeBase(providerId, scope), {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateHook(providerId: string, scope: HookScope, id: string, item: HookItem) {
  return fetchJSON<Hook>(`${scopeBase(providerId, scope)}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
}

export async function deleteHook(providerId: string, scope: HookScope, id: string) {
  await fetch(`${scopeBase(providerId, scope)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function reorderHooks(providerId: string, scope: HookScope, order: string[]) {
  return fetchJSON<{ order: string[] }>(`${scopeBase(providerId, scope)}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function importHooks(providerId: string, scope: HookScope) {
  return fetchJSON<{ importedCount: number; message?: string }>(
    `${scopeBase(providerId, scope)}/import`,
    { method: 'POST' }
  );
}

export async function syncHooks(providerId: string, scope: HookScope) {
  return fetchJSON<{ success: boolean; syncedCount: number; path: string }>(
    `${scopeBase(providerId, scope)}/sync`,
    { method: 'POST' }
  );
}

export async function validateRawHookConfig(providerId: string, scope: HookScope, content: string) {
  return fetchJSON<HookLintReport>(`${scopeBase(providerId, scope)}/validate-raw`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
