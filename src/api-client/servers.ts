import { fetchJSON, apiUrl } from './fetch';

export async function getServers() {
  return fetchJSON<Array<Record<string, unknown>>>(apiUrl('/servers'));
}

export async function getServer(id: string) {
  return fetchJSON<Record<string, unknown>>(apiUrl(`/servers/${id}`));
}

export async function createServer(payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(apiUrl('/servers'), { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateServer(id: string, payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(apiUrl(`/servers/${id}`), { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteServer(id: string) {
  await fetch(apiUrl(`/servers/${id}`), { method: 'DELETE' });
}

export async function setServerEnabled(id: string, enabled: boolean) {
  return fetchJSON<Record<string, unknown>>(apiUrl(`/servers/${id}/enabled`), {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function reorderServers(order: string[]) {
  return fetchJSON<{ order: string[] }>(apiUrl('/servers/reorder'), {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function getServerTools(id: string) {
  const res = await fetch(apiUrl(`/servers/${id}/tools`), {
    headers: { 'Content-Type': 'application/json' },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string; error?: string }).message || (data as { error?: string }).error || res.statusText;
    const err = new Error(res.status === 404 && msg === 'Not Found'
      ? 'API not found. Make sure the AI Tools Manager server is running.'
      : msg);
    (err as Error & { code?: string }).code = (data as { error?: string }).error;
    throw err;
  }
  return data as { tools: Array<{ name: string }> };
}

export async function syncTo(target: string) {
  return fetchJSON<{ path: string }>(apiUrl(`/sync/${target}`), { method: 'POST' });
}

export async function syncToCustom(filePath: string, configKey = 'mcpServers') {
  return fetchJSON<{ path: string }>(apiUrl('/sync/custom'), {
    method: 'POST',
    body: JSON.stringify({ path: filePath, configKey }),
  });
}
