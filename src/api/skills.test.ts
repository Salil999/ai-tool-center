import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from '../index.js';
import type { Express } from 'express';

describe('api/skills', () => {
  let app: Express;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-skills-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ servers: {}, customProviders: [], skills: {}, skillOrder: [], projectDirectories: [] }),
      'utf8'
    );
    process.env.AI_TOOLS_MANAGER_SKILLS_DIR = path.join(tmpDir, 'skills');
    fs.mkdirSync(path.join(tmpDir, 'skills'), { recursive: true });
    app = createApp({ configPath, auditDir: tmpDir });
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
        .send({ content })
        .expect(200);
      expect(res.body).toHaveProperty('findings');
      expect(res.body).toHaveProperty('errors');
      expect(res.body).toHaveProperty('warnings');
      expect(Array.isArray(res.body.findings)).toBe(true);
    });
  });

  describe('integration: skill create/delete with audit', () => {
    const validSkillContent = `---
name: Test Skill
description: A skill for testing
---

Body content here.
`;

    it('creates skill via content → visible in list, audit entry → delete → gone and audit entry', async () => {
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

      const auditRes = await request(app).get('/api/audit');
      expect(auditRes.body.entries).toHaveLength(1);
      expect(auditRes.body.entries[0].action).toBe('skill_create');
      expect(auditRes.body.entries[0].details?.skillId).toBe(skillId);
      expect(auditRes.body.entries[0].details?.skillName).toBe('Test Skill');

      const deleteRes = await request(app).delete(`/api/skills/${skillId}?deleteFiles=true`);
      expect(deleteRes.status).toBe(204);

      const listAfterRes = await request(app).get('/api/skills');
      expect(listAfterRes.body).toHaveLength(0);

      const getAfterRes = await request(app).get(`/api/skills/${skillId}`);
      expect(getAfterRes.status).toBe(404);

      const auditAfterRes = await request(app).get('/api/audit');
      expect(auditAfterRes.body.entries).toHaveLength(2);
      expect(auditAfterRes.body.entries[0].action).toBe('skill_delete');
      expect(auditAfterRes.body.entries[0].details?.skillId).toBe(skillId);
    });

    it('records skill_update in audit log', async () => {
      const createRes = await request(app).post('/api/skills').send({ content: validSkillContent });
      const skillId = createRes.body.id;

      await request(app).put(`/api/skills/${skillId}`).send({ name: 'Updated Skill Name' });

      const auditRes = await request(app).get('/api/audit');
      expect(auditRes.body.entries[0].action).toBe('skill_update');
      expect(auditRes.body.entries[0].details?.skillId).toBe(skillId);
      expect(auditRes.body.entries[0].details?.changedFields).toContain('name');
    });

    it('records skill_enable_toggle in audit log', async () => {
      const createRes = await request(app).post('/api/skills').send({ content: validSkillContent });
      const skillId = createRes.body.id;

      await request(app).patch(`/api/skills/${skillId}/enabled`).send({ enabled: false });

      const auditRes = await request(app).get('/api/audit');
      expect(auditRes.body.entries[0].action).toBe('skill_enable_toggle');
      expect(auditRes.body.entries[0].details?.skillId).toBe(skillId);
      expect(auditRes.body.entries[0].details?.enabled).toBe(false);
    });
  });
});
