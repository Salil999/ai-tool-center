export function InfoModal({ onClose }) {
  return (
    <div className="modal info-modal">
      <div className="modal-header">
        <h2>AI Tools Manager — User Guide</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body info-modal-body">
        <section>
          <h3>What is MCP Server Manager?</h3>
          <p>
            AI Tools Manager is a central hub for configuring <strong>Model Context Protocol (MCP) servers</strong>.
            MCP servers expose tools and resources that AI assistants (like Cursor, Claude, ChatGPT) can use—for
            example, file access, database queries, or API integrations. This app lets you add, edit, and manage
            MCP servers in one place, then <strong>sync</strong> your configuration to multiple AI tools so you
            don&apos;t have to configure each one separately.
          </p>
        </section>

        <section>
          <h3>Header Buttons</h3>
          <dl className="info-dl">
            <dt>Sync</dt>
            <dd>
              A dropdown that writes your current server list to an AI tool&apos;s config file. Click it to see
              targets (Cursor, VS Code, Claude, OpenCode, ChatGPT, Codex, Gemini CLI, Windsurf, Antigravity). Choosing a target overwrites that tool&apos;s MCP config with your servers. Use
              <strong> Custom…</strong> to specify a file path and config key (e.g. <code>mcpServers</code>) for
              tools not in the list.
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
            <li><strong>VS Code</strong> — <code>mcp.json</code> in your VS Code user directory</li>
            <li><strong>Claude</strong> — <code>~/.claude/mcp.json</code></li>
            <li><strong>OpenCode</strong> — <code>~/.config/opencode/opencode.json</code></li>
            <li><strong>ChatGPT</strong> — ChatGPT desktop app config</li>
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
            Your server configuration is stored in <code>~/.mcp-manager/config.json</code>. OAuth tokens for
            HTTP servers are stored separately in <code>~/.mcp-manager/oauth-{'{serverId}'}.json</code>. Keep these
            files private and do not share them.
          </p>
        </section>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
