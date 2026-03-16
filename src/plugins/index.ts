/**
 * Registry of plugin providers.
 * Add new providers here as support is added for more tools.
 */

import { OPENCODE_PLUGINS_INFO, listPlugins as listOpenCodePlugins, savePlugins as saveOpenCodePlugins } from './opencode.js';
import type { Plugin, PluginProviderInfo } from '../types.js';

export interface PluginProvider extends PluginProviderInfo {
  listPlugins(): Plugin[];
  savePlugins(plugins: Plugin[]): void;
}

export const PLUGIN_PROVIDERS: PluginProvider[] = [
  {
    ...OPENCODE_PLUGINS_INFO,
    listPlugins: listOpenCodePlugins,
    savePlugins: saveOpenCodePlugins,
  },
];

export function getPluginProvider(id: string): PluginProvider | undefined {
  return PLUGIN_PROVIDERS.find((p) => p.id === id);
}
