import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from '../index.js';
import type { Express } from 'express';

describe('api/audit', () => {
  let app: Express;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ servers: {}, customProviders: [] }), 'utf8');
    app = createApp({ configPath, auditDir: tmpDir });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  describe('GET /api/audit', () => {
    it('returns empty entries initially', async () => {
      const res = await request(app).get('/api/audit');
      expect(res.status).toBe(200);
      expect(res.body.entries).toEqual([]);
    });
  });

  describe('GET /api/audit/options', () => {
    it('returns maxEntries', async () => {
      const res = await request(app).get('/api/audit/options');
      expect(res.status).toBe(200);
      expect(res.body.maxEntries).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/audit/options', () => {
    it('updates maxEntries', async () => {
      const res = await request(app).put('/api/audit/options').send({ maxEntries: 50 });
      expect(res.status).toBe(200);
      expect(res.body.maxEntries).toBe(50);

      const getRes = await request(app).get('/api/audit/options');
      expect(getRes.body.maxEntries).toBe(50);
    });

    it('returns 400 for invalid maxEntries', async () => {
      const res = await request(app).put('/api/audit/options').send({ maxEntries: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('audit recording', () => {
    it('records server create in audit log', async () => {
      await request(app).post('/api/servers').send({
        name: 'Test Server',
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      });

      const res = await request(app).get('/api/audit');
      expect(res.status).toBe(200);
      expect(res.body.entries).toHaveLength(1);
      expect(res.body.entries[0].action).toBe('server_create');
      expect(res.body.entries[0].timestamp).toBeDefined();
      expect(res.body.entries[0].configBefore).toBeDefined();
      expect(res.body.entries[0].configAfter).toBeDefined();
      expect(res.body.entries[0].details?.serverId).toBeDefined();
    });
  });

  describe('DELETE /api/audit', () => {
    it('clears audit log', async () => {
      await request(app).post('/api/servers').send({ name: 'X', type: 'stdio', command: 'node' });
      let res = await request(app).get('/api/audit');
      expect(res.body.entries.length).toBeGreaterThan(0);

      await request(app).delete('/api/audit');
      res = await request(app).get('/api/audit');
      expect(res.body.entries).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('persists audit entries to disk across app restarts', async () => {
      await request(app).post('/api/servers').send({ name: 'Persisted', type: 'stdio', command: 'node' });
      const res1 = await request(app).get('/api/audit');
      expect(res1.body.entries).toHaveLength(1);

      // Create new app instance (simulates restart) with same audit dir
      const app2 = createApp({ configPath: path.join(tmpDir, 'config.json'), auditDir: tmpDir });
      const res2 = await request(app2).get('/api/audit');
      expect(res2.body.entries).toHaveLength(1);
      expect(res2.body.entries[0].action).toBe('server_create');
      expect(res2.body.entries[0].details?.serverId).toBeDefined();
    });
  });
});
