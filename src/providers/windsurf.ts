import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

function getMcpPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE || HOME, '.codeium', 'windsurf', 'mcp_config.json');
  }
  return path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
}

export default createMcpProvider({
  id: 'windsurf',
  name: 'Windsurf',
  getMcpPath,
});
