import { fetchJSON, apiUrl } from './fetch';
import type { AuditEntryResponse } from '../types';

export type { AuditEntryResponse };

export async function getAuditLog() {
  return fetchJSON<{ entries: AuditEntryResponse[] }>(apiUrl('/audit'));
}

export async function getAuditOptions() {
  return fetchJSON<{ maxEntries: number }>(apiUrl('/audit/options'));
}

export async function setAuditOptions(maxEntries: number) {
  return fetchJSON<{ maxEntries: number }>(apiUrl('/audit/options'), {
    method: 'PUT',
    body: JSON.stringify({ maxEntries }),
  });
}

export async function clearAuditLog() {
  await fetch(apiUrl('/audit'), { method: 'DELETE' });
}
