import { fetchJSON, apiUrl } from './fetch';

export async function getImportSources() {
  return fetchJSON<Array<{ id: string; name: string; path: string; exists: boolean; serverCount: number; error?: string }>>(apiUrl('/import/sources'));
}

export async function importFromSource(sourceId: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(apiUrl(`/import/${sourceId}`), { method: 'POST' });
}

