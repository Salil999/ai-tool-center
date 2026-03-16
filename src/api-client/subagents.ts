import { fetchJSON, apiUrl } from './fetch';
import type { SubagentLintReport, SubagentImportSource, ProjectSubagentSource, SubagentImportSourcesResponse } from '@/types';

export type { SubagentImportSource, ProjectSubagentSource, SubagentImportSourcesResponse };

/** Per-provider lint reports keyed by provider ID. */
export type SubagentLintReports = Record<string, SubagentLintReport>;

/** Provider metadata from the API. */
export interface SubagentProviderInfo {
  id: string;
  name: string;
}

export async function getSubagentProviders() {
  return fetchJSON<SubagentProviderInfo[]>(apiUrl('/subagents/providers'));
}

export async function getSubagents() {
  return fetchJSON<Array<Record<string, unknown>>>(apiUrl('/subagents'));
}

export async function createSubagent(payload: { content: string; enabled?: boolean }) {
  return fetchJSON<Record<string, unknown>>(apiUrl('/subagents'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteSubagent(id: string) {
  await fetch(apiUrl(`/subagents/${id}`), { method: 'DELETE' });
}

export async function reorderSubagents(order: string[]) {
  return fetchJSON<{ order: string[] }>(apiUrl('/subagents/reorder'), {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function setSubagentEnabled(id: string, enabled: boolean) {
  return fetchJSON<Record<string, unknown>>(apiUrl(`/subagents/${id}/enabled`), {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function getSubagentContent(id: string) {
  return fetchJSON<{ content: string }>(apiUrl(`/subagents/${id}/content`));
}

export async function saveSubagentContent(id: string, content: string) {
  return fetchJSON<{ success: boolean }>(apiUrl(`/subagents/${id}/content`), {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function getSubagentLint(id: string) {
  return fetchJSON<SubagentLintReports>(apiUrl(`/subagents/${id}/lint`));
}

export async function lintSubagentContent(id: string, content: string) {
  return fetchJSON<SubagentLintReports>(
    apiUrl(`/subagents/${id}/lint-content`),
    { method: 'POST', body: JSON.stringify({ content }) }
  );
}

/** Validate subagent content without an existing subagent. */
export async function validateSubagentContent(content: string, provider?: string) {
  return fetchJSON<SubagentLintReport | SubagentLintReports>(
    apiUrl('/subagents/validate-content'),
    { method: 'POST', body: JSON.stringify({ content, provider }) }
  );
}

// ── Import ─────────────────────────────────────────────────────────

export async function getSubagentImportSources() {
  return fetchJSON<SubagentImportSourcesResponse>(apiUrl('/subagents/import/sources'));
}

export async function importSubagentsFromSource(sourceId: string) {
  return fetchJSON<{ success: boolean; imported: number; total: number }>(
    apiUrl(`/subagents/import/${encodeURIComponent(sourceId)}`),
    { method: 'POST' }
  );
}

// ── Sync ───────────────────────────────────────────────────────────

export async function getSubagentSyncTargets() {
  return fetchJSON<{
    providers: Array<{ id: string; name: string; path: string }>;
    projects: Array<{ id: string; name: string; path: string }>;
  }>(apiUrl('/subagents/sync/targets'));
}

export async function syncSubagentsTo(targetId: string) {
  return fetchJSON<{ path: string; success: boolean; syncedCount: number }>(
    apiUrl('/subagents/sync'),
    { method: 'POST', body: JSON.stringify({ targetId }) }
  );
}
