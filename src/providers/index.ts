import fs from 'fs';
import cursor from './cursor.js';
import vscode from './vscode.js';
import claude from './claude.js';
import claudeDesktop from './claude-desktop.js';
import opencode from './opencode.js';
import geminiCli from './gemini-cli.js';
import augment from './augment.js';
import custom from './custom.js';
import { mergeServers } from './utils.js';
import type { Server, DiscoverSource } from '../types.js';

const PROVIDERS = [
  cursor,
  vscode,
  claude,
  claudeDesktop,
  opencode,
  geminiCli,
  augment,
];

export function discoverSources(): DiscoverSource[] {
  const result: DiscoverSource[] = [];
  for (const provider of PROVIDERS) {
    let exists = false;
    let serverCount = 0;
    let error: string | null = null;

    try {
      const providerPath = provider.getMcpPath();
      if (fs.existsSync(providerPath)) {
        exists = true;
        const servers = provider.importConfig();
        serverCount = Object.keys(servers).length;
      }
    } catch (err) {
      error = (err as Error).message;
    }

    result.push({
      id: provider.id,
      name: provider.name,
      path: provider.getMcpPath(),
      exists,
      serverCount,
      error: error || undefined,
    });
  }
  return result;
}

export function importFromProvider(providerId: string): Record<string, Omit<Server, 'id'>> {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  return provider.importConfig();
}

export function exportToProvider(
  providerId: string,
  servers: Record<string, Omit<Server, 'id'>>
): { path: string; success: boolean } {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  return provider.exportConfig(servers);
}

export function importFromCustom(filePath: string, configKey = 'mcpServers'): Record<string, Omit<Server, 'id'>> {
  return custom.importConfig(filePath, configKey);
}

export function exportToCustom(
  servers: Record<string, Omit<Server, 'id'>>,
  filePath: string,
  configKey = 'mcpServers'
): { path: string; success: boolean } {
  return custom.exportConfig(servers, filePath, configKey);
}

export function getProviderPath(providerId: string): string | null {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider ? provider.getMcpPath() : null;
}

export { PROVIDERS, mergeServers };
