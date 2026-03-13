import { fetchJSON, apiUrl } from './fetch';
import type { ProjectDirectory } from '@/types';

export async function getProjectDirectories() {
  return fetchJSON<ProjectDirectory[]>(apiUrl('/project-directories'));
}

export async function addProjectDirectory(payload: { path: string; name?: string }) {
  return fetchJSON<Record<string, unknown>>(apiUrl('/project-directories'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProjectDirectory(id: string, payload: { path?: string; name?: string }) {
  return fetchJSON<Record<string, unknown>>(apiUrl(`/project-directories/${id}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProjectDirectory(id: string) {
  await fetch(apiUrl(`/project-directories/${id}`), { method: 'DELETE' });
}

export async function reorderProjectDirectories(order: string[]) {
  return fetchJSON<{ order: string[] }>(apiUrl('/project-directories/reorder'), {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}
