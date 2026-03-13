/**
 * Antigravity (Google) provider - https://antigravity.codes/blog/antigravity-mcp-tutorial
 * Config: ~/.antigravity_tools/mcp_config.json (mcpServers format)
 */

import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

function getMcpPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE || process.env.HOME || HOME, '.antigravity_tools', 'mcp_config.json');
  }
  return path.join(HOME, '.antigravity_tools', 'mcp_config.json');
}

export default createMcpProvider({
  id: 'antigravity',
  name: 'Antigravity',
  getMcpPath,
});
