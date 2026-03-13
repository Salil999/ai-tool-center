import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

function getMcpPath(): string {
  const baseDir =
    process.platform === 'darwin'
      ? path.join(HOME, 'Library', 'Application Support', 'Claude')
      : process.platform === 'win32'
        ? path.join(process.env.APPDATA || HOME, 'Claude')
        : path.join(HOME, '.config', 'Claude');
  return path.join(baseDir, 'claude_desktop_config.json');
}

export default createMcpProvider({
  id: 'claude_desktop',
  name: 'Claude Desktop',
  getMcpPath,
});
