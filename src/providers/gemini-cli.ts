import path from 'path';
import { createMcpProvider, HOME } from './utils.js';

const CONFIG_PATH = path.join(HOME, '.gemini', 'settings.json');
const SKILLS_PATH = path.join(HOME, '.gemini', 'skills');

export default createMcpProvider({
  id: 'gemini-cli',
  name: 'Gemini CLI',
  getMcpPath: () => CONFIG_PATH,
  getSkillsPath: () => SKILLS_PATH,
  mergeStrategy: 'merge-mcp',
});
