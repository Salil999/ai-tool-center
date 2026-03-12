const fs = require('fs');
const cursor = require('./cursor');
const vscode = require('./vscode');
const claude = require('./claude');
const claudeDesktop = require('./claude-desktop');
const opencode = require('./opencode');
const chatgpt = require('./chatgpt');
const codex = require('./codex');
const geminiCli = require('./gemini-cli');
const windsurf = require('./windsurf');
const antigravity = require('./antigravity');
const custom = require('./custom');
const { mergeServers } = require('./utils');

const PROVIDERS = [
  cursor,
  vscode,
  claude,
  claudeDesktop,
  opencode,
  chatgpt,
  codex,
  geminiCli,
  windsurf,
  antigravity,
];

function discoverSources() {
  const result = [];
  for (const provider of PROVIDERS) {
    let exists = false;
    let serverCount = 0;
    let error = null;

    try {
      const path = provider.getPath();
      if (fs.existsSync(path)) {
        exists = true;
        const servers = provider.importConfig();
        serverCount = Object.keys(servers).length;
      }
    } catch (err) {
      error = err.message;
    }

    result.push({
      id: provider.id,
      name: provider.name,
      path: provider.getPath(),
      exists,
      serverCount,
      error: error || undefined,
    });
  }
  return result;
}

function importFromProvider(providerId) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  return provider.importConfig();
}

function exportToProvider(providerId, servers) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  return provider.exportConfig(servers);
}

function importFromCustom(filePath, configKey = 'mcpServers') {
  return custom.importConfig(filePath, configKey);
}

function exportToCustom(servers, filePath, configKey = 'mcpServers') {
  return custom.exportConfig(servers, filePath, configKey);
}

function getProviderPath(providerId) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider ? provider.getPath() : null;
}

module.exports = {
  PROVIDERS,
  discoverSources,
  importFromProvider,
  exportToProvider,
  importFromCustom,
  exportToCustom,
  getProviderPath,
  mergeServers,
};
