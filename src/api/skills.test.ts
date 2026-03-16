import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../index.js';
import { request } from '../test/helpers.js';
import type { TestApp } from '../test/helpers.js';

describe('api/skills', () => {
  let app: TestApp;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-skills-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ servers: {}, skills: {}, skillOrder: [], projectDirectories: [] }),
      'utf8'
    );
    process.env.AI_TOOLS_MANAGER_SKILLS_DIR = path.join(tmpDir, 'skills');
    fs.mkdirSync(path.join(tmpDir, 'skills'), { recursive: true });
    app = createApp({ configPath });
  });

  afterEach(() => {
    delete process.env.AI_TOOLS_MANAGER_SKILLS_DIR;
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  describe('POST /api/skills/validate-content', () => {
    it('validates SKILL.md content and returns lint report', async () => {
      const content = `---
name: my-skill
description: A test skill
---

Body content here.
`;
      const res = await request(app)
        .post('/api/skills/validate-content')
        .send({ content });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('findings');
      expect(res.body).toHaveProperty('errors');
      expect(res.body).toHaveProperty('warnings');
      expect(Array.isArray(res.body.findings)).toBe(true);
    });
  });

  describe('integration: skill create/delete', () => {
    const validSkillContent = `---
name: Test Skill
description: A skill for testing
---

Body content here.
`;

    it('creates skill via content → visible in list → delete → gone', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ content: validSkillContent });
      expect(createRes.status).toBe(201);
      const created = createRes.body;
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Skill');
      const skillId = created.id;

      const listRes = await request(app).get('/api/skills');
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].id).toBe(skillId);
      expect(listRes.body[0].name).toBe('Test Skill');

      const deleteRes = await request(app).delete(`/api/skills/${skillId}?deleteFiles=true`);
      expect(deleteRes.status).toBe(204);

      const listAfterRes = await request(app).get('/api/skills');
      expect(listAfterRes.body).toHaveLength(0);

      const getAfterRes = await request(app).get(`/api/skills/${skillId}`);
      expect(getAfterRes.status).toBe(404);
    });
  });
});
