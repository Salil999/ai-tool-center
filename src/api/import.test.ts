import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createTestApp } from '../test/helpers.js';
import type { Express } from 'express';

describe('api/import', () => {
  let app: Express;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-import-test-'));
    app = createTestApp({
      config: {
        servers: {},
        customProviders: [],
      },
    });
  });

  describe('GET /sources', () => {
    it('returns import sources', async () => {
      const res = await request(app).get('/api/import/sources');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /custom', () => {
    it('requires path', async () => {
      const res = await request(app).post('/api/import/custom').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('path is required');
    });

    it('imports from custom file', async () => {
      const configPath = path.join(tmpDir, 'mcp.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          mcpServers: {
            'test-server': {
              command: 'npx',
              args: ['-y', 'x'],
            },
          },
        }),
        'utf8'
      );
      const res = await request(app)
        .post('/api/import/custom')
        .send({ path: configPath, configKey: 'mcpServers' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        imported: 1,
        total: 1,
      });
    });

    it('merges with existing and skips duplicates', async () => {
      const configPath = path.join(tmpDir, 'mcp.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          mcpServers: {
            a: { command: 'node', args: [] },
          },
        }),
        'utf8'
      );
      await request(app).post('/api/import/custom').send({ path: configPath });
      const res = await request(app).post('/api/import/custom').send({ path: configPath });
      expect(res.body.imported).toBe(0);
      expect(res.body.total).toBe(1);
    });
  });
});
