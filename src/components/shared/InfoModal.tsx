import type { TabId } from '@/App';

interface InfoModalProps {
  onClose: () => void;
  activeTab: TabId;
}

const TAB_TITLES: Record<InfoModalProps['activeTab'], string> = {
  mcp: 'MCP Servers — User Guide',
  skills: 'Skills — User Guide',
  rules: 'Rules & AGENTS.md — User Guide',
  credentials: 'API Credentials — User Guide',
  hooks: 'Hooks — User Guide',
  subagents: 'Subagents — User Guide',
  plugins: 'Plugins — User Guide',
};

export function InfoModal({ onClose, activeTab }: InfoModalProps) {
  return (
    <div className="modal info-modal">
      <div className="modal-header">
        <h2 id="info-modal-title">{TAB_TITLES[activeTab]}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body info-modal-body">
        {activeTab === 'mcp' && <MCPInfoContent />}
        {activeTab === 'skills' && <SkillsInfoContent />}
        {activeTab === 'rules' && <RulesInfoContent />}
        {activeTab === 'credentials' && <CredentialsInfoContent />}
        {activeTab === 'hooks' && <HooksInfoContent />}
        {activeTab === 'subagents' && <SubagentsInfoContent />}
        {activeTab === 'plugins' && <PluginsInfoContent />}
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MCPInfoContent() {
  return (
    <>
        <section>
          <h3>What are MCP Servers?</h3>
          <p>
            <strong>Model Context Protocol (MCP) servers</strong> expose tools and resources that AI assistants
            (like Cursor, Claude) can use—for example, file access, database queries, or API integrations.
            AI Tools Manager lets you add, edit, and manage MCP servers in one place, then <strong>sync</strong> your
            configuration to multiple AI tools so you don&apos;t have to configure each one separately.
            For the protocol specification, see{' '}
            <a href="https://modelcontextprotocol.io/specification" target="_blank" rel="noopener noreferrer">
              Model Context Protocol
            </a>
            .
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Sync</dt>
            <dd>
              A dropdown that syncs your current server list to an AI tool&apos;s config file. Click it to see
              targets (Cursor, VS Code, Claude, OpenCode, Gemini CLI, Augment). Choosing a target overwrites that tool&apos;s MCP config with your servers. Use
              <strong> Custom…</strong> to specify a file path and config key (e.g. <code>mcpServers</code>) for
              tools not in the list. A confirmation appears before syncing: whatever is displayed on the page is the source of truth, and it&apos;s strongly recommended to import before syncing.
            </dd>
            <dt>Import</dt>
            <dd>
              Opens a modal to <strong>import</strong> servers from other tools. It scans for config files (Cursor,
              VS Code, Claude, etc.) and lets you import from any that exist. Duplicate servers (same URL or
              command) are skipped. You can also import from a custom JSON file by entering its path and config
              key.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Add Server</h3>
          <p>
            Adds a new MCP server. Opens the edit modal where you configure:
          </p>
          <ul>
            <li><strong>Name</strong> — Display name (e.g. &quot;playwright&quot;, &quot;Cloudflare&quot;).</li>
            <li><strong>Type</strong> — <code>stdio</code> (local process), <code>http</code> (Streamable HTTP), or <code>sse</code> (Server-Sent Events).</li>
            <li><strong>Command</strong> — For stdio: the executable (e.g. <code>npx</code>, <code>node</code>).</li>
            <li><strong>Args</strong> — Arguments (e.g. <code>-y</code>, <code>@modelcontextprotocol/server-playwright</code>).</li>
            <li><strong>Env</strong> — Environment variables as JSON (e.g. <code>{`{"API_KEY": "xxx"}`}</code>).</li>
            <li><strong>URL</strong> — For http and sse: the MCP endpoint (e.g. <code>https://mcp.cloudflare.com/mcp</code>).</li>
            <li><strong>Headers</strong> — Optional HTTP headers as JSON (e.g. <code>{`{"Authorization": "Bearer xxx"}`}</code>).</li>
          </ul>
        </section>

        <section>
          <h3>Server Cards</h3>
          <p>Each server appears as a card. You can:</p>
          <dl className="info-dl">
            <dt>Expand / Collapse</dt>
            <dd>
              Click the row (or the chevron ▶/▼) to expand and see the list of <strong>tools</strong> the server
              exposes. The app fetches tools from the server when you expand. Click &quot;Show less&quot; to
              collapse.
            </dd>
            <dt>Enable / Disable</dt>
            <dd>
              Toggles whether the server is active. Disabled servers are kept in config but excluded when you sync
              to other tools.
            </dd>
            <dt>Edit</dt>
            <dd>
              Opens the edit modal to change the server&apos;s name, command, URL, headers, etc.
            </dd>
            <dt>Delete</dt>
            <dd>
              Removes the server after confirmation. This cannot be undone.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Server Types</h3>
          <dl className="info-dl">
            <dt>stdio (local)</dt>
            <dd>
              Runs a local process (e.g. <code>npx -y @modelcontextprotocol/server-playwright</code>). The app
              spawns the process and communicates via stdin/stdout. Use for servers installed via npm, pip, or
              other package managers.
            </dd>
            <dt>http (Streamable HTTP)</dt>
            <dd>
              Connects to a remote MCP endpoint over HTTP using the Streamable HTTP transport. Uses POST for
              requests and can receive responses via SSE or JSON. Examples: Cloudflare MCP, Sentry MCP. Some
              require OAuth or a Bearer token—add it in <strong>Headers</strong> as <code>{`{"Authorization": "Bearer YOUR_TOKEN"}`}</code>.
            </dd>
            <dt>sse (Server-Sent Events)</dt>
            <dd>
              Connects to a remote MCP endpoint that uses Server-Sent Events for streaming. The client sends
              requests via HTTP POST and receives server-sent events. Supported by VS Code and some other tools.
              Configure with <strong>URL</strong> and optional <strong>Headers</strong>, same as http.
            </dd>
          </dl>
        </section>

        <section>
          <h3>OAuth for HTTP Servers</h3>
          <p>
            Some HTTP servers (e.g. Cloudflare) require OAuth. When you expand such a server without a token:
          </p>
          <ol>
            <li>A browser window opens for you to sign in.</li>
            <li>After authorizing, you&apos;re redirected back and a success message appears.</li>
            <li>Click <strong>Retry</strong> in the expanded card to fetch tools with the new token.</li>
          </ol>
          <p>
            Tokens are stored locally. You only need to complete OAuth once per server.
          </p>
        </section>

        <section>
          <h3>Sync Targets</h3>
          <p>
            Sync writes your enabled servers to the target tool&apos;s config file. Supported targets:
          </p>
          <ul>
            <li><strong>Cursor</strong> — <code>~/.cursor/mcp.json</code></li>
            <li><strong>VS Code</strong> — <code>~/Library/Application Support/Code/User/mcp.json</code> (macOS)</li>
            <li><strong>Claude Code</strong> — <code>~/.claude.json</code></li>
            <li><strong>Claude Desktop</strong> — <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)</li>
            <li><strong>OpenCode</strong> — <code>~/.config/opencode/opencode.json</code></li>
            <li><strong>Gemini CLI</strong> — <code>~/.gemini/settings.json</code></li>
          </ul>
          <p>
            <strong>Custom…</strong> lets you specify any file path and config key for tools not listed.
          </p>
        </section>

        <section>
          <h3>Import Behavior</h3>
          <p>
            Import merges servers from another source into your list. Duplicates (same URL or same command+args)
            are skipped. If a server with the same ID already exists, a numeric suffix is added (e.g.
            <code>playwright-1</code>). You can disable or delete servers you don&apos;t want after importing.
          </p>
        </section>

        <section>
          <h3>Data Storage</h3>
          <p>
            Your server configuration is stored in <code>~/.ai_tools_manager/mcp/config.json</code>. OAuth tokens for
            HTTP servers are stored separately in <code>~/.ai_tools_manager/mcp/oauth-{'{serverId}'}.json</code>. Keep these
            files private and do not share them.
          </p>
        </section>
    </>
  );
}

function SkillsInfoContent() {
  return (
    <>
        <section>
          <h3>What are Agent Skills?</h3>
          <p>
            <strong>Agent Skills</strong> are markdown files that teach AI assistants how to perform specific
            tasks—for example, reviewing PRs using team standards, generating commit messages, querying
            database schemas, or any specialized workflow. Each skill is a directory containing a{' '}
            <code>SKILL.md</code> file with YAML frontmatter (name, description) and markdown instructions.
            This app lets you create, validate, and manage skills in one place.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Sync</dt>
            <dd>
              Copies your enabled skills to a target directory. <strong>Cursor</strong> supports a dedicated
              skills directory (<code>~/.cursor/skills/</code>). You can also sync to a <strong>Project</strong>{' '}
              to write skills to <code>.agents/skills/</code> in that project directory. Most other AI tools
              (Claude Code, OpenCode, VS Code) do not have a dedicated skills directory—for those tools, embed
              instructions in rules or AGENTS.md instead.
            </dd>
            <dt>Import</dt>
            <dd>
              Opens a modal to import skills from provider directories or project directories. Skills are
              copied into the central store at <code>~/.ai_tools_manager/skills/</code>. Duplicate skills
              (same name) are skipped. You can also import from a custom directory path. Importing is useful
              for validating and editing skills even if you don&apos;t plan to sync them.
            </dd>
            <dt>Add Skill</dt>
            <dd>
              Creates a new skill. You provide the full <code>SKILL.md</code> content with YAML frontmatter and
              markdown body. Use <strong>Validate</strong> to check the format before saving.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Skill Cards</h3>
          <p>Each skill appears as a card. You can:</p>
          <dl className="info-dl">
            <dt>Expand / Collapse</dt>
            <dd>
              Click the row (or the chevron ▶/▼) to expand and see the <strong>validation report</strong>.
              The app validates the skill&apos;s format when you expand. Click &quot;Show less&quot; to collapse.
            </dd>
            <dt>Enable / Disable</dt>
            <dd>
              Toggles whether the skill is active. Disabled skills are kept in the list but excluded when you
              sync to providers or projects.
            </dd>
            <dt>Edit</dt>
            <dd>
              Opens the edit modal to change the skill&apos;s name, description, or content.
            </dd>
            <dt>Delete</dt>
            <dd>
              Removes the skill after confirmation. This cannot be undone.
            </dd>
          </dl>
        </section>

        <section>
          <h3>SKILL.md Format</h3>
          <p>
            Every skill requires a <code>SKILL.md</code> file with YAML frontmatter and markdown body:
          </p>
          <ul>
            <li><strong>name</strong> — Unique identifier (max 64 chars, lowercase letters/numbers/hyphens).</li>
            <li><strong>description</strong> — Brief description of what the skill does and when to use it (max 1024 chars). The agent uses this to decide when to apply the skill.</li>
            <li><strong>Body</strong> — Markdown instructions, examples, and workflows for the agent.</li>
          </ul>
          <p>
            See the{' '}
            <a href="https://agentskills.io/specification" target="_blank" rel="noopener noreferrer">
              Agent Skills specification
            </a>{' '}
            for full format details.
          </p>
        </section>

        <section>
          <h3>Project Directories</h3>
          <p>
            Save project paths to quickly sync skills to <code>.agents/skills/</code> in each project. Add a
            path (e.g. <code>~/my-project</code>) and optionally a display name. The <strong>Sync</strong> dropdown
            will list your saved projects so you can sync with one click.
          </p>
        </section>

        <section>
          <h3>Sync Targets</h3>
          <p>
            Sync copies your enabled skills to the target directory. Only tools with a dedicated skills
            directory convention are supported:
          </p>
          <ul>
            <li><strong>Cursor</strong> — <code>~/.cursor/skills/</code> (native skills support)</li>
          </ul>
          <p>
            For projects, skills are written to <code>.agents/skills/</code> inside the project directory.
          </p>
          <p>
            <strong>Note:</strong> Most AI tools do not read from a skills directory. For those tools, use the Rules tab to embed instructions via AGENTS.md or provider rules.
          </p>
        </section>

        <section>
          <h3>Data Storage</h3>
          <p>
            Skills are stored in <code>~/.ai_tools_manager/skills/</code>. Each skill is a subdirectory
            containing its <code>SKILL.md</code> and any supporting files. Keep this directory private if
            your skills contain sensitive information.
          </p>
        </section>
    </>
  );
}

function RulesInfoContent() {
  return (
    <>
        <section>
          <h3>What are Rules &amp; AGENTS.md?</h3>
          <p>
            <strong>Rules</strong> are tool-specific configuration files that give AI coding agents
            instructions—code style, conventions, build steps, and testing procedures. Different tools use different
            formats: <strong>Cursor</strong> uses <code>.cursor/rules/*.mdc</code>. <strong>AGENTS.md</strong> is a
            cross-tool standard supported by Claude, OpenCode, and others. This tab lets you manage all of these in
            one place, organized by scope (Global or per-project).
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Import</dt>
            <dd>
              Opens a modal to import rules from provider directories (Cursor) or project rules paths.
            </dd>
            <dt>Import AGENTS.md</dt>
            <dd>
              Import an AGENTS.md from a project directory. The content is stored centrally and can be synced back
              to the project.
            </dd>
            <dt>Add AGENTS.md</dt>
            <dd>
              Creates a new AGENTS.md for a project. Pick a project path and edit the markdown content.
              Content is stored in <code>~/.ai_tools_manager/agents/</code> and can be synced to the project path.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Provider Rules Sections</h3>
          <p>
            Under each scope (Global or project), each provider has its own section with a <strong>Sync</strong>{' '}
            button and <strong>Add Rule</strong>. Sync copies that section&apos;s rules to the provider&apos;s
            directory. You can:
          </p>
          <dl className="info-dl">
            <dt>Cursor Rules</dt>
            <dd>
              <code>.mdc</code> files with YAML frontmatter (description, globs, alwaysApply). Add, edit, reorder, and
              click <strong>Sync</strong> to sync to Cursor.
            </dd>
            <dt>Custom Rules</dt>
            <dd>
              Add custom rule configs by specifying a directory or file path and extension (.mdc or .md). Each config has its own Sync button to sync to your specified path. Use for tools not in the built-in list.
            </dd>
          </dl>
        </section>

        <section>
          <h3>AGENTS.md</h3>
          <p>
            <strong>AGENTS.md</strong> is a cross-tool standard Markdown file that provides AI coding agents with
            project-specific instructions and context. It appears as a section within each project scope. You can
            edit the content, sync it to the project directory, or remove it.
            See{' '}
            <a href="https://agents.md/" target="_blank" rel="noopener noreferrer">
              agents.md
            </a>{' '}
            for the specification.
          </p>
        </section>

        <section>
          <h3>Provider Conventions</h3>
          <p>Different tools use different paths for rules:</p>
          <ul>
            <li><strong>Cursor</strong> — <code>.cursor/rules/*.mdc</code></li>
            <li><strong>AGENTS.md</strong> — Claude, OpenCode (cross-tool standard)</li>
          </ul>
        </section>

        <section>
          <h3>Data Storage</h3>
          <p>
            Provider rules are stored in <code>~/.ai_tools_manager/rules/</code>. AGENTS.md content is stored in{' '}
            <code>~/.ai_tools_manager/agents/</code>.
          </p>
        </section>
    </>
  );
}

function HooksInfoContent() {
  return (
    <>
      <section>
        <h3>What are Hooks?</h3>
        <p>
          <strong>Hooks</strong> are event-driven automations that run shell commands, call HTTP
          endpoints, or invoke Claude itself at specific points during an AI session—before a tool
          runs, after it completes, when a session starts, and more. They let you validate
          operations, enforce policies, send notifications, or block dangerous actions without
          modifying your prompts.
        </p>
      </section>

      <section>
        <h3>Supported Tools</h3>
        <dl className="info-dl">
          <dt>Claude Code</dt>
          <dd>
            Hooks are stored in <code>~/.claude/settings.json</code> under the <code>hooks</code>{' '}
            key. They apply to all Claude Code sessions globally. Project-scoped hooks can be placed
            in <code>.claude/settings.json</code> inside a project and checked into version control.
            Local hooks (not committed) use <code>.claude/settings.local.json</code> in the project
            and override project settings.
          </dd>
        </dl>
      </section>

      <section>
        <h3>Hook Events, Handlers &amp; Matchers</h3>
        <p>
          Hooks fire at specific lifecycle points (e.g. before/after tool use, session start/end).
          Four handler types: <strong>command</strong> (shell), <strong>http</strong> (webhook),{' '}
          <strong>prompt</strong> (Claude evaluation), and <strong>agent</strong> (subagent). For
          events that support matchers, you can filter by tool name (e.g. <code>Bash</code>,{' '}
          <code>mcp__.*</code>).
        </p>
        <p>
          For the full event list, input schemas, exit codes, and configuration details, see the{' '}
          <a href="https://docs.anthropic.com/en/docs/claude-code/hooks" target="_blank" rel="noopener noreferrer">
            Claude Code Hooks reference
          </a>
          . For a quickstart with examples, see{' '}
          <a href="https://docs.anthropic.com/en/docs/claude-code/hooks-guide" target="_blank" rel="noopener noreferrer">
            Automate workflows with hooks
          </a>
          .
        </p>
      </section>

      <section>
        <h3>Data Storage</h3>
        <p>
          Hooks are written directly to the provider&apos;s config file (e.g.{' '}
          <code>~/.claude/settings.json</code>). Changes take effect immediately—no restart needed.
          To share hooks with a team, use <code>.claude/settings.json</code> inside the project
          repository. For personal, machine-specific hooks that shouldn&apos;t be committed, use{' '}
          <code>.claude/settings.local.json</code> in the project.
        </p>
      </section>
    </>
  );
}

function SubagentsInfoContent() {
  return (
    <>
      <section>
        <h3>What are Subagents?</h3>
        <p>
          <strong>Subagents</strong> are specialized agents that can be invoked to handle specific
          tasks. They extend the capabilities of your main AI assistant by delegating work to
          purpose-built agents for code review, exploration, shell operations, and more.
        </p>
        <p>
          Subagents are defined as markdown files with YAML frontmatter. The frontmatter configures
          the agent (name, model, tools, etc.) and the markdown body becomes the system prompt.
        </p>
      </section>

      <section>
        <h3>Supported Tools</h3>
        <dl className="info-dl">
          <dt>Claude Code</dt>
          <dd>
            Stored in <code>.claude/agents/</code> (project) or <code>~/.claude/agents/</code>{' '}
            (global). Required fields: <code>name</code> (lowercase + hyphens),{' '}
            <code>description</code>. Optional: <code>model</code> (sonnet, opus, haiku, inherit),{' '}
            <code>tools</code>, <code>disallowedTools</code>, <code>permissionMode</code>,{' '}
            <code>maxTurns</code>, <code>skills</code>, <code>mcpServers</code>,{' '}
            <code>hooks</code>, <code>memory</code>, <code>background</code>,{' '}
            <code>isolation</code>.
          </dd>
          <dt>Cursor</dt>
          <dd>
            Stored in <code>.cursor/agents/</code> (project) or <code>~/.cursor/agents/</code>{' '}
            (global). All fields optional. <code>name</code> defaults to the filename.{' '}
            <code>model</code> accepts <code>fast</code>, <code>inherit</code>, or a specific
            model ID. Supports <code>readonly</code> and <code>background</code> booleans.
          </dd>
          <dt>OpenCode</dt>
          <dd>
            Stored in <code>.opencode/agents/</code> (project) or{' '}
            <code>~/.config/opencode/agents/</code> (global). Required:{' '}
            <code>description</code>. Optional: <code>mode</code> (subagent, primary, all),{' '}
            <code>model</code> (provider/model-id format), <code>temperature</code>,{' '}
            <code>top_p</code>, <code>steps</code>, <code>disable</code>, <code>hidden</code>,{' '}
            <code>permission</code> (ask/allow/deny or object), <code>color</code>,{' '}
            <code>tools</code> (object format).
          </dd>
          <dt>VS Code (Copilot)</dt>
          <dd>
            Stored in <code>.github/agents/</code> (workspace) or{' '}
            <code>~/.copilot/agents</code> (user profile). Uses <code>.agent.md</code> or{' '}
            <code>.md</code> extension. All fields optional. Supports{' '}
            <code>tools</code> (array), <code>agents</code> (subagent allowlist),{' '}
            <code>model</code> (string or prioritized array), <code>user-invocable</code>,{' '}
            <code>disable-model-invocation</code>, <code>target</code> (vscode or
            github-copilot), <code>argument-hint</code>, <code>handoffs</code>.
          </dd>
        </dl>
      </section>

      <section>
        <h3>Validation</h3>
        <p>
          Each subagent is validated against all supported provider rules. Expanding a subagent
          card shows provider-specific validation status. Use the Validate button in the editor to
          check before saving.
        </p>
      </section>

      <section>
        <h3>Data Storage</h3>
        <p>
          Subagent files are stored centrally in <code>~/.ai_tools_manager/subagents/</code>.
          Use Sync to copy enabled subagents to provider agent directories.
        </p>
      </section>
    </>
  );
}

function PluginsInfoContent() {
  return (
    <>
      <section>
        <h3>What are Plugins?</h3>
        <p>
          <strong>Plugins</strong> are installable extensions that add new capabilities to an AI
          tool—custom commands, integrations, UI enhancements, or additional context providers.
          Unlike MCP servers (which expose tools via a protocol), plugins are typically npm packages
          that are loaded directly into the tool at startup.
        </p>
      </section>

      <section>
        <h3>Supported Tools</h3>
        <dl className="info-dl">
          <dt>OpenCode</dt>
          <dd>
            Plugins are npm packages listed in the <code>plugin</code> array of{' '}
            <code>~/.config/opencode/opencode.json</code>. OpenCode installs them automatically
            using Bun at startup; packages are cached in{' '}
            <code>~/.cache/opencode/node_modules/</code>. Scoped packages (e.g.{' '}
            <code>@my-org/plugin</code>) are supported. For local plugins that don&apos;t need to
            be published to npm, place <code>.js</code> or <code>.ts</code> files in{' '}
            <code>~/.config/opencode/plugins/</code> (global) or{' '}
            <code>.opencode/plugins/</code> (project-level)—those load automatically without a
            config entry. See{' '}
            <a href="https://opencode.ai/docs" target="_blank" rel="noopener noreferrer">
              OpenCode documentation
            </a>
            {' '}for details.
          </dd>
        </dl>
      </section>

      <section>
        <h3>Adding Plugins</h3>
        <p>
          Click <strong>Add Plugin</strong> inside the provider section and enter the npm package
          name (e.g. <code>opencode-helicone-session</code> or <code>opencode-wakatime</code>). The
          package name is added to the provider&apos;s config file immediately. The tool will fetch
          and install it the next time it starts.
        </p>
      </section>

      <section>
        <h3>Removing Plugins</h3>
        <p>
          Click <strong>Remove</strong> on a plugin card to remove it from the config. The tool
          will no longer load the plugin after the next restart. The cached package in{' '}
          <code>~/.cache/opencode/node_modules/</code> is not deleted automatically.
        </p>
      </section>

      <section>
        <h3>Data Storage</h3>
        <p>
          Plugin lists are stored directly in each tool&apos;s config file. No separate storage is
          used. Changes take effect at next tool startup.
        </p>
      </section>
    </>
  );
}

function CredentialsInfoContent() {
  return (
    <>
        <section>
          <h3>What are API Credentials?</h3>
          <p>
            <strong>API Credentials</strong> are key-value pairs for storing API keys, tokens, and other
            secrets you use with AI tools and MCP servers. This tab lets you manage them in one place.
            Values are masked by default—click the eye icon to reveal and copy them when needed.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Add Credential</dt>
            <dd>
              Creates a new API credential. You provide a <strong>key name</strong> (e.g. <code>OPENAI_API_KEY</code>)
              and the <strong>key value</strong> (your secret). The value is stored securely and masked in the list.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Credential Cards</h3>
          <p>Each credential appears as a card. You can:</p>
          <dl className="info-dl">
            <dt>Reveal / Hide</dt>
            <dd>
              Click the eye icon to reveal the value for copying. Click again to hide it. Values are
              masked as dots (••••) by default for security.
            </dd>
            <dt>Copy</dt>
            <dd>
              When the value is revealed, a <strong>Copy</strong> button appears to copy it to your clipboard.
              You can also click the revealed value to copy.
            </dd>
            <dt>Edit</dt>
            <dd>
              Opens the edit modal to change the key name or value.
            </dd>
            <dt>Delete</dt>
            <dd>
              Removes the credential after confirmation. This cannot be undone.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Data Storage &amp; Sync</h3>
          <p>
            Credentials are stored in <code>~/.ai_tools_manager/creds/creds.json</code>. The file is
            read and written on every action, so changes sync immediately to disk. If you use cloud
            sync (e.g. iCloud, Dropbox) for <code>~/.ai_tools_manager/</code>, your credentials will
            sync across devices. <strong>Keep this directory private</strong>—never commit it to version
            control or share it.
          </p>
        </section>

        <section>
          <h3>Security</h3>
          <p>
            API credentials are sensitive. The app runs locally and stores data only on your machine.
            Ensure your user account has appropriate file permissions and avoid exposing the credentials
            directory to untrusted processes or networks.
          </p>
        </section>
    </>
  );
}
