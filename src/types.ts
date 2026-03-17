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
  /** Optional order of server IDs for display and sync. When absent, uses insertion order. */
  serverOrder?: string[];
  /** Enabled provider IDs. When absent, all builtin providers are enabled. */
  enabledProviders?: string[];
  /** Skills (Agent Skills format - SKILL.md directories) */
  skills: Record<string, Omit<Skill, 'id'>>;
  /** Optional order of skill IDs for display and sync */
  skillOrder?: string[];
  /** Saved project directories for skill sync */
  projectDirectories: ProjectDirectory[];
  /** AGENTS.md rules (source of truth in ~/.ai_tool_center, synced to project paths) */
  agentRules: AgentRule[];
  /** Custom rule configurations (user-defined paths) */
  customRuleConfigs: CustomRuleConfig[];
  /** Order of rule file IDs per provider (cursor, opencode, custom) for provider-specific rules */
  providerRuleOrder?: Record<string, string[]>;
  /** Subagents (markdown files with YAML frontmatter) */
  subagents: Record<string, Omit<Subagent, 'id'>>;
  /** Optional order of subagent IDs for display and sync */
  subagentOrder?: string[];
}

// ── Config function types (shared by all API routes) ──────────────

export interface SaveConfigOptions {
  action: string;
  details?: Record<string, unknown>;
}

export type GetConfig = () => AppConfig;
export type SaveConfig = (cfg: AppConfig, options?: SaveConfigOptions) => void;

/** Provider rule file (e.g. .cursor/rules/*.mdc) */
export interface ProviderRule {
  id: string;
  name: string;
  path: string;
  extension: '.md' | '.mdc';
}

/** Provider interface for import/export */
export interface Provider {
  id: string;
  name: string;
  /** Path to MCP server config (e.g. ~/.cursor/mcp.json) */
  getMcpPath: () => string;
  /** Optional path to skills directory (e.g. ~/.cursor/skills). Providers that support skills implement this. */
  getSkillsPath?: () => string;
  /** Optional path to rules directory or file (AGENTS.md, .cursor/rules, etc.). Providers that support rules implement this. */
  getRulesPath?: () => string;
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

/** AGENTS.md rule stored in ~/.ai_tool_center, synced to project path */
export interface AgentRule {
  id: string;
  projectPath: string;
  name?: string;
}

/** Custom rule configuration (user-defined path for rules) */
export interface CustomRuleConfig {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: '.md' | '.mdc';
}

/** Credential (API key) for API credentials tab */
export interface Credential {
  id: string;
  name: string;
  value: string;
}

// ── Lint types (generic base + domain-specific extensions) ────────

/** Base lint finding shared by all lint domains */
export interface BaseLintFinding {
  field: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

/** Base lint report shared by all lint domains */
export interface BaseLintReport<F extends BaseLintFinding = BaseLintFinding> {
  findings: F[];
  errors: number;
  warnings: number;
  infos: number;
  generatedAt: string;
}

/** Lint finding from skill lint API */
export interface LintFinding extends BaseLintFinding {
  file: string;
  fixable: boolean;
}

/** Lint report from skill lint API */
export interface LintReport extends BaseLintReport<LintFinding> {
  files: number;
  fixed: number;
}

/** Rule lint finding from rule lint API */
export interface RuleLintFinding extends BaseLintFinding {
  file: string;
  fixable: boolean;
}

/** Rule lint report from rule lint API */
export type RuleLintReport = BaseLintReport<RuleLintFinding>;

/** Subagent lint finding */
export type SubagentLintFinding = BaseLintFinding;

/** Subagent lint report */
export type SubagentLintReport = BaseLintReport<SubagentLintFinding>;

/** Hook lint finding from hook lint API */
export interface HookLintFinding extends BaseLintFinding {
  hookIndex?: number;
}

/** Hook lint report from hook lint API */
export type HookLintReport = BaseLintReport<HookLintFinding>;

// ── Import source types (generic base + domain-specific) ─────────

/** Base import source shared by all import domains */
export interface BaseImportSource {
  id: string;
  name: string;
  path: string;
  exists: boolean;
  error?: string;
}

/** Base project source with nested import sources */
export interface BaseProjectSource<S extends BaseImportSource = BaseImportSource> {
  id: string;
  name: string;
  path: string;
  sources: S[];
}

/** Rule import source (used by both backend discover and frontend client) */
export interface RuleImportSource extends BaseImportSource {
  hasContent: boolean;
}

/** Project rule source with nested sources */
export type ProjectRuleSource = BaseProjectSource<RuleImportSource>;

/** Response from rule import sources API */
export interface RuleImportSourcesResponse {
  providers: RuleImportSource[];
  projects: ProjectRuleSource[];
}

/** Response from agent import sources API */
export interface AgentImportSourcesResponse {
  projects: ProjectRuleSource[];
  agents: RuleImportSource[];
}

/** Skill import source (used by both backend discover and frontend client) */
export interface SkillImportSource extends BaseImportSource {
  skillCount: number;
}

/** Project skill source with nested sources */
export type ProjectSkillSource = BaseProjectSource<SkillImportSource>;

/** Response from skill import sources API */
export interface SkillImportSourcesResponse {
  providers: SkillImportSource[];
  projects: ProjectSkillSource[];
}

/** Hook definition stored in the central store (no id — id is the map key). */
export interface HookItem {
  event: string;
  matcher?: string;
  /** Handler type. Not all providers support all types. */
  type: 'command' | 'http' | 'prompt' | 'agent';
  // command
  command?: string;
  // http
  url?: string;
  headers?: Record<string, string>;
  // prompt / agent
  prompt?: string;
  model?: string;
  // common optional
  timeout?: number;
  // Claude Code specific
  async?: boolean;
  statusMessage?: string;
  // Cursor specific
  failClosed?: boolean;
  loopLimit?: number | null;
  // VS Code specific (Workspace scope)
  windows?: string;
  linux?: string;
  osx?: string;
  cwd?: string;
  env?: Record<string, string>;
}

/** Definition for a hook provider (Claude Code, Cursor, …). */
export interface HookProviderDefinition {
  id: string;
  name: string;
  /** All hook event names this provider supports. */
  supportedEvents: readonly string[];
  /** Subset of events where a matcher field is meaningful. */
  matcherEvents: readonly string[];
  /** Handler types supported by this provider. */
  supportedTypes: readonly HookItem['type'][];
  /** Whether hooks can be scoped to a specific project. */
  supportsProjectScope: boolean;
  /** Whether project-local (uncommitted) hooks are supported, e.g. .claude/settings.local.json. */
  supportsProjectLocalScope?: boolean;
  /** Whether global/user scope is supported. When false, only project scope is available (e.g. VS Code Workspace). */
  supportsGlobalScope?: boolean;
  /** Path to the user/global hooks config file. */
  getUserSettingsPath(): string;
  /** Path to the project-level hooks config file. */
  getProjectSettingsPath(projectPath: string): string;
  /** Path to the project-local (uncommitted) hooks config file, when supported. */
  getProjectLocalSettingsPath?(projectPath: string): string;
  /** Read hooks from a config file and return canonical HookItems. */
  importFromFile(filePath: string): HookItem[];
  /** Write canonical HookItems to a config file. Merges, does not clobber unrelated keys. */
  syncToFile(hooks: HookItem[], filePath: string): void;
}

/** Plugin definition (installed extension/package, stored in provider config) */
export interface Plugin {
  id: string;
  source: string;
  name: string;
}

/** Provider capability descriptor for hooks */
export interface HookProviderInfo {
  id: string;
  name: string;
  configPath: string;
  supportedEvents: string[];
  /** Events where a matcher field is meaningful */
  matcherEvents: string[];
}

/** Provider capability descriptor for plugins */
export interface PluginProviderInfo {
  id: string;
  name: string;
  configPath: string;
  format: 'opencode-npm';
}

/** MCP discover source (used by import/discover) */
export interface DiscoverSource extends BaseImportSource {
  serverCount: number;
}

/** Subagent definition (markdown file with YAML frontmatter) */
export interface Subagent {
  id?: string;
  name: string;
  description?: string;
  path: string;
  enabled: boolean;
}

/** Subagent import source */
export interface SubagentImportSource extends BaseImportSource {
  agentCount: number;
}

/** Project subagent source with nested sources */
export type ProjectSubagentSource = BaseProjectSource<SubagentImportSource>;

/** Response from subagent import sources API */
export interface SubagentImportSourcesResponse {
  providers: SubagentImportSource[];
  projects: ProjectSubagentSource[];
}

/** Skillhub registry search result item */
export interface SkillhubSkill {
  id: string;
  name: string;
  slug: string;
  author: string;
  description: string | null;
  description_zh?: string | null;
  category?: string;
  tags?: string[];
  simple_score?: number | null;
  simple_rating?: string | null;
  github_stars?: number;
  repo_url?: string;
}
