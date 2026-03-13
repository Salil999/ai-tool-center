import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

const CONFIG_PATH = path.join(HOME, '.cursor', 'mcp.json');
const SKILLS_PATH = path.join(HOME, '.cursor', 'skills');
const RULES_PATH = path.join(HOME, '.cursor', 'rules');

export default createMcpProvider({
  id: 'cursor',
  name: 'Cursor',
  getMcpPath: () => CONFIG_PATH,
  getSkillsPath: () => SKILLS_PATH,
  getRulesPath: () => RULES_PATH,
});
