import { fetchJSON, apiUrl } from './fetch';
import type { Plugin, PluginProviderInfo } from '@/types';

export type { Plugin, PluginProviderInfo };

export async function getPluginProviders() {
  return fetchJSON<PluginProviderInfo[]>(apiUrl('/plugins/providers'));
}

export async function getPlugins(providerId: string) {
  return fetchJSON<Plugin[]>(apiUrl(`/plugins/${encodeURIComponent(providerId)}`));
}

export async function savePlugins(providerId: string, plugins: Plugin[]) {
  return fetchJSON<Plugin[]>(apiUrl(`/plugins/${encodeURIComponent(providerId)}`), {
    method: 'PUT',
    body: JSON.stringify({ plugins }),
  });
}
