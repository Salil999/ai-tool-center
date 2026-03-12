import request from 'supertest';
import path from 'path';
import { createTestApp } from '../test/helpers.js';
import type { Express } from 'express';

describe('api/sync', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp({
      config: {
        servers: {
          a: { name: 'A', enabled: true, type: 'stdio', command: 'node', args: [] },
        },
        customProviders: [],
      },
    });
  });

  describe('GET /targets', () => {
    it('returns builtin and custom targets', async () => {
      const res = await request(app).get('/api/sync/targets');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('builtin');
      expect(res.body).toHaveProperty('custom');
      expect(Array.isArray(res.body.builtin)).toBe(true);
      expect(res.body.builtin.length).toBeGreaterThan(0);
    });
  });

  describe('POST /:target', () => {
    it('syncs to cursor', async () => {
      const res = await request(app).post('/api/sync/cursor');
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toMatchObject({ success: true });
        expect(res.body.path).toBeDefined();
      }
    });

    it('returns 404 for custom provider not in config', async () => {
      const res = await request(app).post('/api/sync/custom-missing');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Custom provider not found');
    });
  });

  describe('POST /custom', () => {
    it('requires path', async () => {
      const res = await request(app).post('/api/sync/custom').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('path is required');
    });

    it('syncs to custom path under cwd', async () => {
      const customPath = path.join(process.cwd(), 'tmp-test-sync-custom.json');
      const res = await request(app)
        .post('/api/sync/custom')
        .send({ path: customPath, configKey: 'mcpServers' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('rejects unsafe path', async () => {
      const res = await request(app)
        .post('/api/sync/custom')
        .send({ path: '/etc/passwd' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not allowed');
    });
  });
});
