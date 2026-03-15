import path from 'path';
import { createMcpProvider } from './utils.js';
import { platformConfigPath } from '../utils/platform-path.js';

function getMcpPath(): string {
  return path.join(platformConfigPath('Claude'), 'claude_desktop_config.json');
}

export default createMcpProvider({
  id: 'claude_desktop',
  name: 'Claude Desktop',
  getMcpPath,
});
