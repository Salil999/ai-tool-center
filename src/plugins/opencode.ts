/**
 * OpenCode plugin provider.
 * Reads/writes the `plugin` array in ~/.config/opencode/opencode.json.
 * Docs: https://opencode.ai/docs/plugins/
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import type { Plugin, PluginProviderInfo } from '../types.js';

const CONFIG_PATH = path.join(os.homedir(), '.config', 'opencode', 'opencode.json');

export const OPENCODE_PLUGINS_INFO: PluginProviderInfo = {
  id: 'opencode',
  name: 'OpenCode',
  configPath: CONFIG_PATH,
  format: 'opencode-npm',
};

// ── File I/O ─────────────────────────────────────────────────────────────────

function stripJsonComments(str: string): string {
  return str
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

function readConfig(): Record<string, unknown> {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return JSON.parse(stripJsonComments(raw)) as Record<string, unknown>;
  }
}

function writeConfig(data: Record<string, unknown>): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function sourceToId(source: string): string {
  return source.replace(/[^a-z0-9_@/-]/gi, '-').toLowerCase();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listPlugins(): Plugin[] {
  const config = readConfig();
  const plugins = Array.isArray(config.plugin) ? (config.plugin as string[]) : [];
  return plugins.filter((s) => typeof s === 'string').map((source) => ({
    id: sourceToId(source),
    source,
    name: source,
  }));
}

export function savePlugins(plugins: Plugin[]): void {
  const config = readConfig();
  const pluginArray = plugins.map((p) => p.source);
  const updated: Record<string, unknown> = { ...config };
  if (pluginArray.length > 0) {
    updated.plugin = pluginArray;
  } else {
    delete updated.plugin;
  }
  writeConfig(updated);
}
