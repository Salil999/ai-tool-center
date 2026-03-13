import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

const CONFIG_PATH = path.join(HOME, '.claude', 'mcp.json');
const SKILLS_PATH = path.join(HOME, '.claude', 'skills');

export default createMcpProvider({
  id: 'claude',
  name: 'Claude Code',
  getMcpPath: () => CONFIG_PATH,
  getSkillsPath: () => SKILLS_PATH,
});
