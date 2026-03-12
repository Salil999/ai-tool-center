/** Canonical server definition used across the app */
export interface Server {
  id?: string;
  name: string;
  enabled: boolean;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

/** Audit log entry for configuration changes */
export interface AuditEntry {
  timestamp: string; // ISO 8601
  action: string;
  configBefore: AppConfig;
  configAfter: AppConfig;
  details?: Record<string, unknown>;
}

/** Audit options stored in config */
export interface AuditOptions {
  maxEntries?: number;
}

/** App config file structure */
export interface AppConfig {
  servers: Record<string, Omit<Server, 'id'>>;
  /** Optional order of server IDs for display and sync. When absent, uses insertion order. */
  serverOrder?: string[];
  customProviders: CustomProvider[];
  /** Audit log options (max entries to retain) */
  auditOptions?: AuditOptions;
  /** Skills (Agent Skills format - SKILL.md directories) */
  skills: Record<string, Omit<Skill, 'id'>>;
  /** Optional order of skill IDs for display and sync */
  skillOrder?: string[];
  /** Saved project directories for skill sync */
  projectDirectories: ProjectDirectory[];
}

export interface CustomProvider {
  id: string;
  name: string;
  path: string;
  configKey: string;
}

/** Provider interface for import/export */
export interface Provider {
  id: string;
  name: string;
  getPath: () => string;
  importConfig: () => Record<string, Omit<Server, 'id'>>;
  exportConfig: (servers: Record<string, Omit<Server, 'id'>>) => { path: string; success: boolean };
}

/** MCP tool from listTools */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** Skill definition (Agent Skills format - SKILL.md in directory) */
export interface Skill {
  id?: string;
  path: string;
  name: string;
  /** From SKILL.md frontmatter; not stored in config */
  description?: string;
  enabled: boolean;
}

/** Saved project directory for skill sync */
export interface ProjectDirectory {
  id: string;
  path: string;
  name?: string;
}

/** Credential (API key) for API credentials tab */
export interface Credential {
  id: string;
  name: string;
  value: string;
}

/** Audit log entry as returned from API (config is JSON-serialized) */
export interface AuditEntryResponse {
  timestamp: string;
  action: string;
  configBefore: Record<string, unknown>;
  configAfter: Record<string, unknown>;
  details?: Record<string, unknown>;
}

/** Lint finding from skill lint API */
export interface LintFinding {
  field: string;
  file: string;
  fixable: boolean;
  level: 'error' | 'warning' | 'info';
  message: string;
}

/** Lint report from skill lint API */
export interface LintReport {
  files: number;
  findings: LintFinding[];
  errors: number;
  warnings: number;
  infos: number;
  fixed: number;
  generatedAt: string;
}
