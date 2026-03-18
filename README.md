# AI Tool Center

A local web app for managing AI coding tool configurations. Manage MCP servers, agent skills, rules, subagents, hooks, and API credentials all in one place. Sync them to the supported AI providers.

## Features

- **MCP Servers** — Add, edit, enable/disable, and sync MCP server configs to supported tools
- **Agent Skills** — Create and manage SKILL.md skills; sync to provider skill directories or projects
- **Rules** — Manage AGENTS.md rules and Cursor `.mdc` rules; sync to provider rule paths
- **Subagents** — Define and sync subagent markdown files across tools
- **Hooks** — Configure event-driven automations for Claude Code
- **Plugins** — Manage OpenCode plugins
- **API Credentials** — Store API keys and secrets locally, masked with reveal toggle
- **Settings** — Export/import config, reset to defaults

## Supported Providers

- Claude Code
- Cursor
- VS Code
- OpenCode

## Download

Pre-built binaries for Linux (x64), macOS (x64 and Apple Silicon), and Windows (x64) are available on the [Releases page](https://github.com/Salil999/ai-tool-center/releases).

Each release includes a `.tar.gz` archive with the executable and `dist/` folder.

1. Download the archive for your platform from the [Releases page](https://github.com/Salil999/ai-tool-center/releases)
2. Extract it:
   ```bash
   tar xzvf ai-tool-center-<platform>.tar.gz
   ```
3. On macOS, remove the quarantine attribute that macOS adds to downloaded files:
   ```bash
   xattr -dr com.apple.quarantine ./ai-tool-center
   ```
4. Make the binary executable (Linux/macOS):
   ```bash
   chmod +x ./ai-tool-center
   ```
5. Run it:
   ```bash
   ./ai-tool-center
   ```

The app will be available at `http://localhost:3847`.

> **Note:** The executable must be run from the directory where you extracted the archive, as it requires the `dist/` folder to be present alongside it.

**CLI options:**

```bash
./ai-tool-center --port 3000               # Custom port
./ai-tool-center --config ~/my-config.json  # Custom config path
```

## Data Storage

All data is stored in `~/.ai_tool_center/`:

| Path | Contents |
|------|----------|
| `~/.ai_tool_center/mcp/config.json` | Server configurations |
| `~/.ai_tool_center/mcp/oauth-*.json` | OAuth tokens for HTTP servers |
| `~/.ai_tool_center/skills/` | Agent skill files |
| `~/.ai_tool_center/rules/` | Provider rule files |
| `~/.ai_tool_center/agents/` | AGENTS.md content |
| `~/.ai_tool_center/subagents/` | Subagent definitions |
| `~/.ai_tool_center/hooks/` | Hook configurations |
| `~/.ai_tool_center/creds/creds.json` | API credentials |

Override the config path with `--config <path>` or the `MCP_MANAGER_CONFIG` env var.

---

## Development

### Installation

Requires [Bun](https://bun.sh) 1.0+.

```bash
git clone https://github.com/Salil999/ai-tool-center.git
cd ai-tool-center
bun install
```

### Running locally

```bash
bun run dev
```

Builds the frontend and starts the server with hot reload on `http://localhost:3847`.

### Production build

```bash
bun run build
bun start
```

```bash
bun start -- --port 3000               # Custom port
bun start -- --config ~/my-config.json  # Custom config path
```

### Compile standalone executable

```bash
bun run compile
```

Produces `./ai-tool-center` (or `ai-tool-center.exe` on Windows). The executable must be run from a directory containing the `dist/` folder.

### Creating a release

Releases are created automatically when a semver tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## License

GPL-3.0
