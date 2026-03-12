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
