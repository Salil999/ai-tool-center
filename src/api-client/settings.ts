import { fetchJSON, apiUrl } from './fetch';

export async function resetConfig(): Promise<void> {
  await fetch(apiUrl('/settings/reset'), { method: 'POST' });
}

export async function exportConfig(): Promise<Blob> {
  const res = await fetch(apiUrl('/settings/export'));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return res.blob();
}

export async function importConfig(file: File): Promise<{
  imported: { servers: number; skills: number; creds: number };
}> {
  const text = await file.text();
  const body = JSON.parse(text);
  return fetchJSON<{ success: boolean; imported: { servers: number; skills: number; creds: number } }>(
    apiUrl('/settings/import'),
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  ).then((data) => ({ imported: data.imported }));
}

export async function getTheme(): Promise<{ theme: 'dark' | 'light' | 'system' }> {
  return fetchJSON<{ theme: 'dark' | 'light' | 'system' }>(apiUrl('/settings/theme'));
}

export async function setTheme(theme: 'dark' | 'light' | 'system'): Promise<{ theme: string }> {
  return fetchJSON<{ theme: string }>(apiUrl('/settings/theme'), {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  });
}
