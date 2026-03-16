/**
 * Registry of hook providers.
 * To add a new provider, implement HookProviderDefinition and add it here.
 */

import { claudeHookProvider } from './claude.js';
import { cursorHookProvider } from './cursor.js';
import { vscodeHookProvider } from './vscode.js';
import type { HookProviderDefinition } from '../../types.js';

export const HOOK_PROVIDERS: HookProviderDefinition[] = [
  claudeHookProvider,
  cursorHookProvider,
  vscodeHookProvider,
];

export function getHookProvider(id: string): HookProviderDefinition | undefined {
  return HOOK_PROVIDERS.find((p) => p.id === id);
}
