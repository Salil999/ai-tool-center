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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ servers: {}, customProviders: [], skills: {}, skillOrder: [], projectDirectories: [] }),
      'utf8'
    );
    app = createApp({ configPath, auditDir: tmpDir });
  });

  afterEach(() => {
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
});
