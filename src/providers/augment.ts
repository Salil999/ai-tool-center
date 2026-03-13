/**
 * Augment provider - https://docs.augmentcode.com/setup-augment/mcp
 * Config: ~/.augment/settings.json (mcpServers format)
 */

import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

function getMcpPath(): string {
  return path.join(HOME, '.augment', 'settings.json');
}

export default createMcpProvider({
  id: 'augment',
  name: 'Augment',
  getMcpPath,
});
