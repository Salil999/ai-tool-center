const fs = require('fs');
const path = require('path');
const os = require('os');
const cursorProvider = require('../providers/cursor');

const DEFAULT_CONFIG = {
  servers: {},
  customProviders: [],
};

function getDefaultConfigPath() {
  const homeDir = path.join(os.homedir(), '.mcp-manager');
  const homeConfig = path.join(homeDir, 'config.json');
  try {
    if (!fs.existsSync(homeDir)) {
      fs.mkdirSync(homeDir, { recursive: true });
    }
    return homeConfig;
  } catch (_) {
    const cwdDir = path.join(process.cwd(), '.mcp-manager');
    try {
      if (!fs.existsSync(cwdDir)) {
        fs.mkdirSync(cwdDir, { recursive: true });
      }
      return path.join(cwdDir, 'config.json');
    } catch (e) {
      throw new Error(`Cannot create config directory: ${e.message}`);
    }
  }
}

/**
 * Load config from file. Creates default if not exists.
 * On first run, optionally import from ~/.cursor/mcp.json if it exists.
 */
function loadConfig(configPath) {
  const resolvedPath = configPath || getDefaultConfigPath();
  const dir = path.dirname(resolvedPath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    throw new Error(`Cannot create config directory: ${err.message}`);
  }

  if (!fs.existsSync(resolvedPath)) {
    const config = { ...DEFAULT_CONFIG };
    try {
      if (fs.existsSync(cursorProvider.getPath())) {
        config.servers = cursorProvider.importConfig();
      }
    } catch (err) {
      console.warn('Could not import from Cursor mcp.json:', err.message);
    }
    saveConfig(resolvedPath, config);
    return config;
  }

  try {
    const data = fs.readFileSync(resolvedPath, 'utf8');
    const config = JSON.parse(data);
    return { ...DEFAULT_CONFIG, ...config, servers: config.servers || {} };
  } catch (err) {
    throw new Error(`Failed to load config: ${err.message}`);
  }
}

function saveConfig(configPath, config) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function getConfigPath(override) {
  return override || process.env.MCP_MANAGER_CONFIG || getDefaultConfigPath();
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigPath,
  DEFAULT_CONFIG,
};
