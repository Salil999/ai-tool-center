const API = '/api';

export async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function getServers() {
  return fetchJSON(`${API}/servers`);
}

export async function getServer(id) {
  return fetchJSON(`${API}/servers/${id}`);
}

export async function createServer(payload) {
  return fetchJSON(`${API}/servers`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateServer(id, payload) {
  return fetchJSON(`${API}/servers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteServer(id) {
  await fetch(`${API}/servers/${id}`, { method: 'DELETE' });
}

export async function setServerEnabled(id, enabled) {
  return fetchJSON(`${API}/servers/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function getServerTools(id) {
  const res = await fetch(`${API}/servers/${id}/tools`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText);
    err.code = data.error;
    throw err;
  }
  return data;
}

export async function syncTo(target) {
  return fetchJSON(`${API}/sync/${target}`, { method: 'POST' });
}

export async function syncToCustom(path, configKey = 'mcpServers') {
  return fetchJSON(`${API}/sync/custom`, {
    method: 'POST',
    body: JSON.stringify({ path, configKey }),
  });
}

export async function getImportSources() {
  return fetchJSON(`${API}/import/sources`);
}

export async function importFromSource(sourceId) {
  return fetchJSON(`${API}/import/${sourceId}`, { method: 'POST' });
}

export async function importFromCustomFile(filePath, configKey = 'mcpServers') {
  return fetchJSON(`${API}/import/custom`, {
    method: 'POST',
    body: JSON.stringify({ path: filePath, configKey }),
  });
}
