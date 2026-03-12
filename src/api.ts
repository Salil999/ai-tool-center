const API = '/api';

export async function fetchJSON<T = Record<string, unknown>>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export async function getServers() {
  return fetchJSON<Array<Record<string, unknown>>>(`${API}/servers`);
}

export async function getServer(id: string) {
  return fetchJSON<Record<string, unknown>>(`${API}/servers/${id}`);
}

export async function createServer(payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(`${API}/servers`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateServer(id: string, payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(`${API}/servers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteServer(id: string) {
  await fetch(`${API}/servers/${id}`, { method: 'DELETE' });
}

export async function setServerEnabled(id: string, enabled: boolean) {
  return fetchJSON<Record<string, unknown>>(`${API}/servers/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function getServerTools(id: string) {
  const res = await fetch(`${API}/servers/${id}/tools`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || res.statusText);
    (err as Error & { code?: string }).code = (data as { error?: string }).error;
    throw err;
  }
  return data as { tools: Array<{ name: string }> };
}

export async function syncTo(target: string) {
  return fetchJSON<{ path: string }>(`${API}/sync/${target}`, { method: 'POST' });
}

export async function syncToCustom(filePath: string, configKey = 'mcpServers') {
  return fetchJSON<{ path: string }>(`${API}/sync/custom`, {
    method: 'POST',
    body: JSON.stringify({ path: filePath, configKey }),
  });
}

export async function getImportSources() {
  return fetchJSON<Array<{ id: string; name: string; path: string; exists: boolean; serverCount: number; error?: string }>>(`${API}/import/sources`);
}

export async function importFromSource(sourceId: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(`${API}/import/${sourceId}`, { method: 'POST' });
}

export async function importFromCustomFile(filePath: string, configKey = 'mcpServers') {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(`${API}/import/custom`, {
    method: 'POST',
    body: JSON.stringify({ path: filePath, configKey }),
  });
}
