interface InfoModalProps {
  onClose: () => void;
  activeTab: 'mcp' | 'skills' | 'rules' | 'agents' | 'credentials';
}

export function InfoModal({ onClose, activeTab }: InfoModalProps) {
  const title =
    activeTab === 'mcp'
      ? 'MCP Servers — User Guide'
      : activeTab === 'skills'
        ? 'Skills — User Guide'
        : activeTab === 'rules'
          ? 'Rules — User Guide'
          : activeTab === 'agents'
            ? 'AGENTS.md — User Guide'
            : 'API Credentials — User Guide';

  return (
    <div className="modal info-modal">
      <div className="modal-header">
        <h2 id="info-modal-title">{title}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body info-modal-body">
        {activeTab === 'mcp' && <MCPInfoContent />}
        {activeTab === 'skills' && <SkillsInfoContent />}
        {activeTab === 'rules' && <RulesInfoContent />}
        {activeTab === 'agents' && <AgentsInfoContent />}
        {activeTab === 'credentials' && <CredentialsInfoContent />}
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
            (like Cursor, Claude, ChatGPT) can use—for example, file access, database queries, or API integrations.
            AI Tools Manager lets you add, edit, and manage MCP servers in one place, then <strong>sync</strong> your
            configuration to multiple AI tools so you don&apos;t have to configure each one separately.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Sync</dt>
            <dd>
              A dropdown that syncs your current server list to an AI tool&apos;s config file. Click it to see
              targets (Cursor, VS Code, Claude, OpenCode, ChatGPT, Codex, Gemini CLI, Windsurf, Antigravity, GitHub Copilot). Choosing a target overwrites that tool&apos;s MCP config with your servers. Use
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
            <li><strong>Claude Code</strong> — <code>~/.claude/mcp.json</code></li>
            <li><strong>Claude Desktop</strong> — <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)</li>
            <li><strong>OpenCode</strong> — <code>~/.config/opencode/opencode.json</code></li>
            <li><strong>ChatGPT</strong> — <code>~/Library/Application Support/OpenAI/ChatGPT/mcp.json</code> (macOS)</li>
            <li><strong>Codex</strong> — <code>~/.codex/config.toml</code></li>
            <li><strong>Gemini CLI</strong> — <code>~/.gemini/settings.json</code></li>
            <li><strong>Windsurf</strong> — <code>~/.codeium/windsurf/mcp_config.json</code></li>
            <li><strong>Antigravity</strong> — <code>~/.antigravity_tools/mcp_config.json</code></li>
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
            This app lets you manage skills in one place and <strong>sync</strong> them to Cursor, Claude,
            Gemini CLI, and other tools, or to project directories.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Sync</dt>
            <dd>
              A dropdown that copies your enabled skills to a target. Choose a <strong>Provider</strong> (Cursor,
              Claude Code, Gemini CLI, GitHub Copilot, or Agents) to sync to that tool&apos;s skills directory.
              Choose a <strong>Project</strong> to sync to <code>.agents/skills/</code> in that project. Add
              project paths in the Project Directories section below.
            </dd>
            <dt>Import</dt>
            <dd>
              Opens a modal to import skills from provider directories (Cursor, Claude, Gemini CLI, etc.) or
              project directories. Skills are copied into the central store at <code>~/.ai_tools_manager/skills/</code>.
              Duplicate skills (same name) are skipped. You can also import from a custom directory path.
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
            path (e.g. <code>~/my-project</code>) and optionally a display name.             The <strong>Sync</strong> dropdown
            will list your saved projects so you can sync with one click.
          </p>
        </section>

        <section>
          <h3>Sync Targets</h3>
          <p>
            Sync copies your enabled skills to the target directory. Supported providers:
          </p>
          <ul>
            <li><strong>Cursor</strong> — <code>~/.cursor/skills/</code></li>
            <li><strong>Claude Code</strong> — <code>~/.claude/skills/</code></li>
            <li><strong>Gemini CLI</strong> — <code>~/.gemini/skills/</code></li>
            <li><strong>GitHub Copilot</strong> — <code>~/.copilot/skills/</code></li>
            <li><strong>Agents (cross-client)</strong> — <code>~/.agents/skills/</code></li>
          </ul>
          <p>
            For projects, skills are written to <code>.agents/skills/</code> inside the project directory.
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
          <h3>What are Provider Rules?</h3>
          <p>
            <strong>Provider rules</strong> are tool-specific configuration files that give AI coding agents
            instructions—code style, conventions, build steps, and testing procedures. Different tools use different
            formats: <strong>Cursor</strong> uses <code>.cursor/rules/*.mdc</code>, <strong>Augment</strong> uses{' '}
            <code>.augment/rules/*.md</code>. This tab lets you manage Cursor and Augment rules, plus add{' '}
            <strong>custom rule configs</strong> for other tools, then sync to providers or projects. Tools that use
            AGENTS.md (Claude, Gemini CLI, OpenCode) are managed in the AGENTS.md tab.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Import</dt>
            <dd>
              Opens a modal to import rules from provider directories (Cursor, Augment) or project paths (AGENTS.md,
              CLAUDE.md). Imported content is merged into your AGENTS.md entries (managed in the AGENTS.md tab).
            </dd>
          </dl>
        </section>

        <section>
          <h3>Provider Rules Sections</h3>
          <p>Each provider has its own section with a <strong>Sync</strong> button and <strong>Add Rule</strong>. Sync copies that section&apos;s rules to the provider&apos;s directory (e.g. Cursor rules → <code>~/.cursor/rules/</code>, Augment rules → <code>~/.augment/rules/</code>). You can:</p>
          <dl className="info-dl">
            <dt>Cursor Rules</dt>
            <dd>
              <code>.mdc</code> files with YAML frontmatter (description, globs, alwaysApply). Add, edit, reorder, and
              click <strong>Sync</strong> to sync to Cursor.
            </dd>
            <dt>Augment Rules</dt>
            <dd>
              <code>.md</code> files with Always, Manual, or Auto types. Add, edit, reorder, and click <strong>Sync</strong> to sync to Augment.
            </dd>
            <dt>Custom Rules</dt>
            <dd>
              Add custom rule configs by specifying a directory or file path and extension (.mdc or .md). Each config has its own Sync button to sync to your specified path. Use for tools not in the built-in list.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Provider Conventions</h3>
          <p>Different tools use different paths for rules:</p>
          <ul>
            <li><strong>Cursor</strong> — <code>~/.cursor/rules/*.mdc</code></li>
            <li><strong>Augment</strong> — <code>~/.augment/rules/*.md</code></li>
            <li><strong>AGENTS.md</strong> — Claude, Gemini CLI, OpenCode use AGENTS.md (managed in AGENTS.md tab)</li>
          </ul>
        </section>

        <section>
          <h3>Data Storage</h3>
          <p>
            Provider rules are stored in <code>~/.ai_tools_manager/rules/</code>. AGENTS.md entries are managed in the
            AGENTS.md tab.
          </p>
        </section>
    </>
  );
}

function AgentsInfoContent() {
  return (
    <>
        <section>
          <h3>What is AGENTS.md?</h3>
          <p>
            <strong>AGENTS.md</strong> is a cross-tool standard Markdown file that provides AI coding agents with
            project-specific instructions and context—build steps, testing procedures, code style, and conventions.
            Content is stored in <code>~/.ai_tools_manager/agents/</code> and synced to project paths. Supported by
            Cursor, OpenAI Codex, GitHub Copilot, Windsurf, Gemini CLI, and many others.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Sync</dt>
            <dd>
              A dropdown that syncs AGENTS.md to providers (Claude, Gemini CLI, OpenCode, Universal Agent) or to project
              paths. Choose a source agent and target.
            </dd>
            <dt>Import</dt>
            <dd>
              Import rules from provider directories or project paths into an AGENTS.md entry. Content is stored in{' '}
              <code>~/.ai_tools_manager/agents/</code>.
            </dd>
            <dt>Add AGENTS.md</dt>
            <dd>
              Creates a new AGENTS.md entry. Pick a project path, optionally add a display name, and edit the markdown
              content. Content is stored centrally and can be synced to the project path.
            </dd>
          </dl>
        </section>

        <section>
          <h3>Data Storage</h3>
          <p>
            All AGENTS.md content is stored in <code>~/.ai_tools_manager/agents/</code>. Each entry has an ID; content
            is in <code>agents/{'{id}'}/AGENTS.md</code>. Use Sync to project to write content to your project directory.
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
