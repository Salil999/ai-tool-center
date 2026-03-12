const API = '/api';

export async function fetchJSON<T = Record<string, unknown>>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error || res.statusText;
    throw new Error(res.status === 404 && msg === 'Not Found'
      ? 'API not found. Make sure the AI Tools Manager server is running (e.g. npm run dev or npm run start).'
      : msg);
  }
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

export async function reorderServers(order: string[]) {
  return fetchJSON<{ order: string[] }>(`${API}/servers/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function getServerTools(id: string) {
  const res = await fetch(`${API}/servers/${id}/tools`, {
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

export interface AuditEntry {
  timestamp: string;
  action: string;
  configBefore: Record<string, unknown>;
  configAfter: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export async function getAuditLog() {
  return fetchJSON<{ entries: AuditEntry[] }>(`${API}/audit`);
}

export async function getAuditOptions() {
  return fetchJSON<{ maxEntries: number }>(`${API}/audit/options`);
}

export async function setAuditOptions(maxEntries: number) {
  return fetchJSON<{ maxEntries: number }>(`${API}/audit/options`, {
    method: 'PUT',
    body: JSON.stringify({ maxEntries }),
  });
}

export async function clearAuditLog() {
  await fetch(`${API}/audit`, { method: 'DELETE' });
}

// Skills
export async function getSkills() {
  return fetchJSON<Array<Record<string, unknown>>>(`${API}/skills`);
}

export async function getSkill(id: string) {
  return fetchJSON<Record<string, unknown>>(`${API}/skills/${id}`);
}

export async function createSkill(payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(`${API}/skills`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSkill(id: string, payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(`${API}/skills/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteSkill(id: string, deleteFiles = false) {
  await fetch(`${API}/skills/${id}${deleteFiles ? '?deleteFiles=true' : ''}`, { method: 'DELETE' });
}

export async function reorderSkills(order: string[]) {
  return fetchJSON<{ order: string[] }>(`${API}/skills/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function setSkillEnabled(id: string, enabled: boolean) {
  return fetchJSON<Record<string, unknown>>(`${API}/skills/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export interface LintFinding {
  field: string;
  file: string;
  fixable: boolean;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface LintReport {
  files: number;
  findings: LintFinding[];
  errors: number;
  warnings: number;
  infos: number;
  fixed: number;
  generatedAt: string;
}

export async function getSkillLint(id: string) {
  return fetchJSON<LintReport>(`${API}/skills/${id}/lint`);
}

export async function getSkillContent(id: string) {
  return fetchJSON<{ content: string }>(`${API}/skills/${id}/content`);
}

export async function saveSkillContent(id: string, content: string) {
  return fetchJSON<{ success: boolean }>(`${API}/skills/${id}/content`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function lintSkillContent(id: string, content: string) {
  return fetchJSON<LintReport>(`${API}/skills/${id}/lint-content`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/** Lint SKILL.md content without an existing skill (e.g. when adding new). */
export async function lintContent(content: string) {
  return fetchJSON<LintReport>(`${API}/skills/validate-content`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function getSkillSyncTargets() {
  return fetchJSON<{ providers: Array<{ id: string; name: string; path: string }>; projects: Array<{ id: string; name: string; path: string }> }>(`${API}/skills/sync/targets`);
}

export async function syncSkillsTo(target: string) {
  return fetchJSON<{ path: string; success: boolean; syncedCount: number }>(`${API}/skills/sync/${target}`, { method: 'POST' });
}

export async function syncSkillsToProject(projectId: string) {
  return fetchJSON<{ path: string; success: boolean; syncedCount: number }>(`${API}/skills/sync/project/${projectId}`, { method: 'POST' });
}

export async function getSkillImportSources() {
  return fetchJSON<Array<{ id: string; name: string; path: string; exists: boolean; skillCount: number; error?: string }>>(`${API}/skills/import/sources`);
}

export async function importSkillsFromSource(sourceId: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(`${API}/skills/import/${encodeURIComponent(sourceId)}`, { method: 'POST' });
}

export async function importSkillsFromCustomPath(dirPath: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(`${API}/skills/import/custom`, {
    method: 'POST',
    body: JSON.stringify({ path: dirPath }),
  });
}

// Project directories
export async function getProjectDirectories() {
  return fetchJSON<Array<Record<string, unknown>>>(`${API}/project-directories`);
}

export async function addProjectDirectory(payload: { path: string; name?: string }) {
  return fetchJSON<Record<string, unknown>>(`${API}/project-directories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProjectDirectory(id: string, payload: { path?: string; name?: string }) {
  return fetchJSON<Record<string, unknown>>(`${API}/project-directories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProjectDirectory(id: string) {
  await fetch(`${API}/project-directories/${id}`, { method: 'DELETE' });
}

// Credentials (API keys)
export interface Credential {
  id: string;
  name: string;
  value: string;
}

export async function getCredentials() {
  return fetchJSON<Credential[]>(`${API}/credentials`);
}

export async function getCredential(id: string) {
  return fetchJSON<Credential>(`${API}/credentials/${id}`);
}

export async function createCredential(payload: { name: string; value: string }) {
  return fetchJSON<Credential>(`${API}/credentials`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCredential(id: string, payload: { name?: string; value?: string }) {
  return fetchJSON<Credential>(`${API}/credentials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCredential(id: string) {
  await fetch(`${API}/credentials/${id}`, { method: 'DELETE' });
}

export async function reorderCredentials(order: string[]) {
  return fetchJSON<{ order: string[] }>(`${API}/credentials/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}
