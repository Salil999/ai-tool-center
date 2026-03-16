import { API_BASE } from '../lib/config';

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

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
