import { apiUrl, fetchJSON } from './fetch';

export interface BuiltinProvider {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  capabilities: { mcp: boolean; skills: boolean; rules: boolean };
}

export interface CustomProviderItem {
  id: string;
  name: string;
  path: string;
  configKey: string;
  enabled: boolean;
}

export interface ProvidersResponse {
  builtin: BuiltinProvider[];
  custom: CustomProviderItem[];
}

export async function getProviders(): Promise<ProvidersResponse> {
  return fetchJSON<ProvidersResponse>(apiUrl('/providers'));
}

export async function updateEnabledProviders(enabledProviders: string[]): Promise<{ enabledProviders: string[] }> {
  return fetchJSON<{ enabledProviders: string[] }>(apiUrl('/providers/enabled'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabledProviders }),
  });
}

export async function addCustomProvider(params: {
  name: string;
  path: string;
  configKey?: string;
}): Promise<CustomProviderItem> {
  return fetchJSON<CustomProviderItem>(apiUrl('/providers/custom'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function updateCustomProvider(
  id: string,
  params: { name?: string; path?: string; configKey?: string }
): Promise<CustomProviderItem> {
  return fetchJSON<CustomProviderItem>(apiUrl(`/providers/custom/${encodeURIComponent(id)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function deleteCustomProvider(id: string): Promise<void> {
  await fetch(apiUrl(`/providers/custom/${encodeURIComponent(id)}`), { method: 'DELETE' });
}
