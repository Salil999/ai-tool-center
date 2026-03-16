import { apiUrl, fetchJSON } from './fetch';

export interface BuiltinProvider {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  capabilities: { mcp: boolean; skills: boolean; rules: boolean };
}

export interface ProvidersResponse {
  builtin: BuiltinProvider[];
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

