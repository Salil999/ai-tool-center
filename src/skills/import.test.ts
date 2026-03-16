import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { discoverSkillSources, importFromSkillSource } from './import.js';
import type { AppConfig } from '../types.js';

describe('skills/import', () => {
  let tmpDir: string;
  let skillsDir: string;
  const baseConfig: AppConfig = {};

  beforeEach(() => {
    // Use path under HOME so isPathSafe allows it
    tmpDir = fs.mkdtempSync(path.join(os.homedir(), '.skills-import-test-'));
    skillsDir = path.join(tmpDir, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });
    process.env.AI_TOOLS_MANAGER_SKILLS_DIR = path.join(tmpDir, 'managed');
  });

  afterEach(() => {
    delete process.env.AI_TOOLS_MANAGER_SKILLS_DIR;
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  function createSkillDir(parentPath: string, name: string, content = '') {
    const skillPath = path.join(parentPath, name);
    fs.mkdirSync(skillPath, { recursive: true });
    const skillMd = `---
name: ${name}
description: Test skill ${name}
---
${content || `# ${name}\n\nInstructions.`}`;
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillMd, 'utf8');
    return skillPath;
  }

  describe('discoverSkillSources', () => {
    it('returns provider sources', () => {
      const config = { ...baseConfig };
      const { providers } = discoverSkillSources(config);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0]).toHaveProperty('id');
      expect(providers[0]).toHaveProperty('name');
      expect(providers[0]).toHaveProperty('path');
      expect(providers[0]).toHaveProperty('exists');
      expect(providers[0]).toHaveProperty('skillCount');
    });

    it('includes project directories with provider subdirs', () => {
      const projectPath = path.join(tmpDir, 'my-project');
      fs.mkdirSync(path.join(projectPath, '.cursor', 'skills'), { recursive: true });
      createSkillDir(path.join(projectPath, '.cursor', 'skills'), 'proj-skill');

      const config: AppConfig = {
        ...baseConfig,
        projectDirectories: [{ id: 'p1', path: projectPath, name: 'My Project' }],
      };
      const { projects } = discoverSkillSources(config);
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('p1');
      expect(projects[0].name).toBe('My Project');
      expect(projects[0].sources).toHaveLength(2);

      const cursorSource = projects[0].sources.find((s) => s.id === 'project-p1__cursor');
      expect(cursorSource).toBeDefined();
      expect(cursorSource?.exists).toBe(true);
      expect(cursorSource?.skillCount).toBe(1);
    });
  });

  describe('importFromSkillSource', () => {
    it('imports skills from a source path', () => {
      createSkillDir(skillsDir, 'skill-a');
      createSkillDir(skillsDir, 'skill-b');

      const config: AppConfig = {
        ...baseConfig,
        skills: {},
        skillOrder: [],
      };
      const result = importFromSkillSource('test', skillsDir, config);

      expect(result.imported).toBe(2);
      expect(result.total).toBe(2);
      expect(result.skillIds).toHaveLength(2);
      expect(config.skills).toBeDefined();
      expect(Object.keys(config.skills!)).toHaveLength(2);
    });

    it('skips duplicate skills by name', () => {
      createSkillDir(skillsDir, 'dup-skill');

      const config: AppConfig = {
        ...baseConfig,
        skills: { 'dup-skill': { path: '/existing', name: 'dup-skill', enabled: true } },
        skillOrder: ['dup-skill'],
      };
      const result = importFromSkillSource('test', skillsDir, config);

      expect(result.imported).toBe(0);
      expect(result.total).toBe(1);
    });

    it('throws on path outside allowed directories', () => {
      const config = { ...baseConfig };
      expect(() =>
        importFromSkillSource('test', '/etc/passwd', config)
      ).toThrow('Path is not allowed');
    });
  });
});
