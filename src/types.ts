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

/** App config file structure */
export interface AppConfig {
  servers: Record<string, Omit<Server, 'id'>>;
  customProviders: CustomProvider[];
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
