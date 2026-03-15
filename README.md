# AI Tools Manager

A local web app to manage MCP (Model Context Protocol) server configurations and sync them to AI tools like Cursor, VS Code, Claude Code, and more.

## Features

- **View** MCP server configurations
- **Edit** server configs (stdio, http, sse)
- **Enable/disable** servers
- **View terminal output** for stdio servers (start/stop and stream output)
- **Sync** to Cursor, VS Code, Claude Code, OpenCode, and more with one click
- **Custom sync** to any config file path
- **API Credentials** tab for storing API keys and secrets (masked with reveal toggle)

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

- **Default config**: `~/.ai_tools_manager/mcp/config.json`
- **API credentials**: `~/.ai_tools_manager/creds/creds.json`
- **Override**: `--config <path>` or `MCP_MANAGER_CONFIG` env var

On first run, if `~/.cursor/mcp.json` exists, it will be imported as the initial config.

## Sync Targets

| Target | Config Path |
|--------|-------------|
| Cursor | `~/.cursor/mcp.json` |
| VS Code | macOS: `~/Library/Application Support/Code/User/mcp.json` · Windows: `%APPDATA%\Code\User\mcp.json` · Linux: `~/.config/Code/User/mcp.json` |
| Claude Code | `~/.claude.json` |
| Claude Desktop | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` · Windows: `%APPDATA%\Claude\claude_desktop_config.json` · Linux: `~/.config/Claude/claude_desktop_config.json` |
| OpenCode | `~/.config/opencode/opencode.json` |
| Gemini CLI | `~/.gemini/settings.json` |

## License

GPL-3.0
