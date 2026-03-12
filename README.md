# AI Tools Manager

A local web app to manage MCP (Model Context Protocol) server configurations and sync them to AI tools like Cursor, VS Code, Claude Code, and more.

## Features

- **View** MCP server configurations
- **Edit** server configs (stdio, http, sse)
- **Enable/disable** servers
- **View terminal output** for stdio servers (start/stop and stream output)
- **Sync** to Cursor, VS Code, Claude Code, OpenCode, ChatGPT, and more with one click
- **Custom sync** to any config file path

## Installation

Requires [Bun](https://bun.sh) (recommended) or Node.js 18+.

```bash
bun install
# or: npm install
```

Use `bun start` or `npm run start:node` if you prefer Node.

## Usage

**Development** (React hot reload + API):

```bash
npm run dev
```

Opens Vite on http://localhost:5173 (proxies `/api` to backend on 3847).

**Production**:

```bash
npm run build
npm start
```

Then open http://localhost:3847 in your browser.

**CLI options**:

```bash
bun start -- --port 3000              # Custom port
bun start -- --config ~/my-config.json # Custom config
```

**Standalone executable** (Bun only):

```bash
bun run compile
```

Produces `./ai-tools-manager` (or `ai-tools-manager.exe` on Windows). Run from the project root so it can find the `dist/` folder. For a fully self-contained single-file binary with embedded frontend, see [Bun's compile docs](https://bun.com/docs/bundler/executables).

## Releases

Releases are built automatically when you push a tag that follows [semantic versioning](https://semver.org/) (e.g. `v1.0.0`, `v2.1.3`, `v1.0.0-beta.1`):

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers a GitHub Action that builds cross-platform executables for:

- **Linux** (x64)
- **macOS** (x64 and Apple Silicon arm64)
- **Windows** (x64)

Each release includes a `.tar.gz` archive containing the executable and `dist/` folder. Extract and run from the extracted directory.

## Config

- **Default config**: `~/.mcp-manager/config.json`
- **Override**: `--config <path>` or `MCP_MANAGER_CONFIG` env var

On first run, if `~/.cursor/mcp.json` exists, it will be imported as the initial config.

## Sync Targets

| Target | Config Path |
|--------|-------------|
| Cursor | `~/.cursor/mcp.json` |
| VS Code | `~/Library/Application Support/Code/User/mcp.json` (macOS) |
| Claude Code | `~/.claude/mcp.json` |
| OpenCode | `~/.config/opencode/opencode.json` |
| ChatGPT | `~/Library/Application Support/OpenAI/ChatGPT/mcp.json` (macOS) |
| Codex | `~/.codex/config.toml` |
| Gemini CLI | `~/.gemini/settings.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Antigravity | `~/.antigravity_tools/mcp_config.json` |

## TODOs

### Server Management

- [ ] Server groups / tags — Group servers (e.g. "dev", "prod", "personal") and sync only selected groups to specific tools
- [ ] Reorder servers — Drag-and-drop ordering so you can control the order in synced configs
- [ ] Duplicate server — Copy an existing server as a starting point for a new one
- [ ] Bulk actions — Enable/disable, delete, or sync multiple servers at once
- [ ] Search/filter — Filter the server list by name, type, or enabled status

### Sync & Export

- [ ] Sync all targets — One-click sync to all configured tools instead of one at a time
- [ ] Sync presets — Save presets like "Cursor + Claude" or "VS Code only" and sync with one click
- [ ] Export/backup — Export config as JSON and restore from backup
- [ ] Sync history — Log when and where you synced, with optional rollback
- [ ] Auto-sync — Watch config changes and sync automatically when files change

### Server Discovery & Validation

- [ ] Health check — Ping stdio/HTTP servers to show which are reachable
- [ ] MCP server registry — Browse and add popular servers (e.g. from MCP registry) with one click
- [ ] Tool descriptions — Show tool descriptions/schemas in the expanded card, not just names
- [ ] Resources view — List MCP resources (prompts, etc.) in addition to tools

### UX & Workflow

- [ ] Terminal output for stdio — Start/stop stdio servers and stream their output
- [ ] OAuth flow in UI — Start OAuth from the server card instead of only when expanding
- [ ] Keyboard shortcuts — Shortcuts for Add, Import, Sync, etc.
- [ ] Dark/light theme — Theme toggle
- [ ] Config file picker — File picker for custom import/sync paths instead of typing paths
- [ ] Recent sync targets — Quick access to recently used sync targets

### Advanced

- [ ] Environment profiles — Switch between profiles (e.g. work vs personal) with different server sets
- [ ] Diff view — Compare your config with a target tool's config before syncing
- [ ] Server templates — Predefined templates for common servers (Playwright, filesystem, etc.)
- [ ] CLI sync — `mcp-manager sync cursor` from the terminal
- [ ] Notifications — Optional desktop notifications when sync completes or fails

## License

GPL-3.0
