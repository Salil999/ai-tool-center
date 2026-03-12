import { fetchJSON, apiUrl } from './fetch';
import type { Credential } from '../types';

export type { Credential };

export async function getCredentials() {
  return fetchJSON<Credential[]>(apiUrl('/credentials'));
}

export async function getCredential(id: string) {
  return fetchJSON<Credential>(apiUrl(`/credentials/${id}`));
}

export async function createCredential(payload: { name: string; value: string }) {
  return fetchJSON<Credential>(apiUrl('/credentials'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCredential(id: string, payload: { name?: string; value?: string }) {
  return fetchJSON<Credential>(apiUrl(`/credentials/${id}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCredential(id: string) {
  await fetch(apiUrl(`/credentials/${id}`), { method: 'DELETE' });
}

export async function reorderCredentials(order: string[]) {
  return fetchJSON<{ order: string[] }>(apiUrl('/credentials/reorder'), {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}
