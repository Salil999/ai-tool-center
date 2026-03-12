import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AppConfig, AuditEntry } from '../types.js';

const DEFAULT_MAX_ENTRIES = 500;
const AUDIT_FILENAME = 'audit.json';

function getDefaultAuditDir(): string {
  return path.join(os.homedir(), '.ai_tools_manager');
}

function getAuditPath(dir: string): string {
  return path.join(dir, AUDIT_FILENAME);
}

/** File-backed audit log store with configurable max size */
export class AuditStore {
  private entries: AuditEntry[] = [];
  private maxEntries: number;
  private readonly auditDir: string;
  private readonly auditPath: string;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES, auditDir?: string) {
    this.maxEntries = Math.max(1, maxEntries);
    this.auditDir = auditDir ?? getDefaultAuditDir();
    this.auditPath = getAuditPath(this.auditDir);
    this.load();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(this.auditPath)) {
        const data = fs.readFileSync(this.auditPath, 'utf8');
        const parsed = JSON.parse(data) as { entries?: AuditEntry[] };
        this.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
        while (this.entries.length > this.maxEntries) {
          this.entries.pop();
        }
      }
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    this.ensureDir();
    fs.writeFileSync(
      this.auditPath,
      JSON.stringify({ entries: this.entries }, null, 2),
      'utf8'
    );
  }

  /** Record a configuration change */
  record(action: string, configBefore: AppConfig, configAfter: AppConfig, details?: Record<string, unknown>): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      configBefore: JSON.parse(JSON.stringify(configBefore)),
      configAfter: JSON.parse(JSON.stringify(configAfter)),
      details,
    };
    this.entries.unshift(entry);
    while (this.entries.length > this.maxEntries) {
      this.entries.pop();
    }
    this.save();
  }

  /** Get all audit entries (newest first) */
  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  /** Update max entries limit */
  setMaxEntries(max: number): void {
    this.maxEntries = Math.max(1, max);
    while (this.entries.length > this.maxEntries) {
      this.entries.pop();
    }
    this.save();
  }

  /** Get current max entries setting */
  getMaxEntries(): number {
    return this.maxEntries;
  }

  /** Clear all entries */
  clear(): void {
    this.entries = [];
    this.save();
  }
}
