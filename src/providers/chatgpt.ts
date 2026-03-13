import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

function getMcpPath(): string {
  if (process.platform === 'darwin') {
    return path.join(HOME, 'Library', 'Application Support', 'OpenAI', 'ChatGPT', 'mcp.json');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || HOME, 'OpenAI', 'ChatGPT', 'mcp.json');
  }
  return path.join(HOME, '.config', 'openai', 'chatgpt', 'mcp.json');
}

export default createMcpProvider({
  id: 'chatgpt',
  name: 'ChatGPT',
  getMcpPath,
});
