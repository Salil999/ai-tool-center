import { fetchJSON, apiUrl } from './fetch';
import type { LintReport, SkillhubSkill } from '@/types';

export type { LintReport, SkillhubSkill };

export async function getSkills() {
  return fetchJSON<Array<Record<string, unknown>>>(apiUrl('/skills'));
}

export async function createSkill(payload: Record<string, unknown>) {
  return fetchJSON<Record<string, unknown>>(apiUrl('/skills'), { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteSkill(id: string, deleteFiles = false) {
  await fetch(apiUrl(`/skills/${id}${deleteFiles ? '?deleteFiles=true' : ''}`), { method: 'DELETE' });
}

export async function reorderSkills(order: string[]) {
  return fetchJSON<{ order: string[] }>(apiUrl('/skills/reorder'), {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function setSkillEnabled(id: string, enabled: boolean) {
  return fetchJSON<Record<string, unknown>>(apiUrl(`/skills/${id}/enabled`), {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function getSkillLint(id: string) {
  return fetchJSON<LintReport>(apiUrl(`/skills/${id}/lint`));
}

export async function getSkillContent(id: string) {
  return fetchJSON<{ content: string }>(apiUrl(`/skills/${id}/content`));
}

export async function saveSkillContent(id: string, content: string) {
  return fetchJSON<{ success: boolean }>(apiUrl(`/skills/${id}/content`), {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function lintSkillContent(id: string, content: string) {
  return fetchJSON<LintReport>(apiUrl(`/skills/${id}/lint-content`), {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/** Lint SKILL.md content without an existing skill (e.g. when adding new). */
export async function lintContent(content: string) {
  return fetchJSON<LintReport>(apiUrl('/skills/validate-content'), {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function getSkillSyncTargets() {
  return fetchJSON<{ providers: Array<{ id: string; name: string; path: string }>; projects: Array<{ id: string; name: string; path: string }> }>(apiUrl('/skills/sync/targets'));
}

export async function syncSkillsTo(target: string) {
  return fetchJSON<{ path: string; success: boolean; syncedCount: number }>(apiUrl(`/skills/sync/${target}`), { method: 'POST' });
}

export async function syncSkillsToProject(projectId: string) {
  return fetchJSON<{ path: string; success: boolean; syncedCount: number }>(apiUrl(`/skills/sync/project/${projectId}`), { method: 'POST' });
}

export async function getSkillImportSources() {
  return fetchJSON<Array<{ id: string; name: string; path: string; exists: boolean; skillCount: number; error?: string }>>(apiUrl('/skills/import/sources'));
}

export async function importSkillsFromSource(sourceId: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(apiUrl(`/skills/import/${encodeURIComponent(sourceId)}`), { method: 'POST' });
}

export async function importSkillsFromCustomPath(dirPath: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(apiUrl('/skills/import/custom'), {
    method: 'POST',
    body: JSON.stringify({ path: dirPath }),
  });
}

export async function searchSkillhubRegistry(query: string, limit = 20) {
  return fetchJSON<{ skills: SkillhubSkill[]; total: number }>(
    apiUrl(`/skills/registry/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  );
}

export async function installSkillFromRegistry(slug: string, repoUrl: string) {
  return fetchJSON<{ id: string; path: string; name: string; enabled: boolean }>(apiUrl('/skills/registry/install'), {
    method: 'POST',
    body: JSON.stringify({ slug, repo_url: repoUrl }),
  });
}
