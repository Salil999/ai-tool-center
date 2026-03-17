import fs from 'fs';
import path from 'path';
import os from 'os';

const CREDS_FILENAME = 'creds.json';

export interface CredentialItem {
  name: string;
  value: string;
}

export interface CredentialsData {
  order: string[];
  items: Record<string, CredentialItem>;
}

function getDefaultCredsDir(): string {
  return path.join(os.homedir(), '.ai_tool_center', 'creds');
}

function getCredsPath(dir: string): string {
  return path.join(dir, CREDS_FILENAME);
}

/** File-backed credential store at ~/.ai_tool_center/creds/creds.json */
export function getCredsDir(override?: string): string {
  return override ?? getDefaultCredsDir();
}

/** Load credentials from disk. Returns fresh data on each call (sync-safe). */
export function loadCreds(credsDir?: string): CredentialsData {
  const dir = credsDir ?? getDefaultCredsDir();
  const credsPath = getCredsPath(dir);

  try {
    if (!fs.existsSync(credsPath)) {
      return { order: [], items: {} };
    }
    const data = fs.readFileSync(credsPath, 'utf8');
    const parsed = JSON.parse(data) as { order?: string[]; items?: Record<string, CredentialItem> };
    const order = Array.isArray(parsed.order) ? parsed.order : [];
    const items = parsed.items && typeof parsed.items === 'object' ? parsed.items : {};
    return { order, items };
  } catch {
    return { order: [], items: {} };
  }
}

/** Save credentials to disk. */
export function saveCreds(data: CredentialsData, credsDir?: string): void {
  const dir = credsDir ?? getDefaultCredsDir();
  const credsPath = getCredsPath(dir);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(credsPath, JSON.stringify(data, null, 2), 'utf8');
}
