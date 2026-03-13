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

    it('records server delete in audit log', async () => {
      const createRes = await request(app).post('/api/servers').send({
        name: 'To Delete',
        type: 'stdio',
        command: 'node',
        args: [],
      });
      const serverId = createRes.body.id;

      await request(app).delete(`/api/servers/${serverId}`);

      const res = await request(app).get('/api/audit');
      expect(res.body.entries).toHaveLength(2);
      expect(res.body.entries[0].action).toBe('server_delete');
      expect(res.body.entries[0].details?.serverId).toBe(serverId);
      expect(res.body.entries[0].configBefore.servers?.[serverId]).toBeDefined();
      expect(res.body.entries[0].configAfter.servers?.[serverId]).toBeUndefined();
    });

    it('records server update in audit log', async () => {
      const createRes = await request(app).post('/api/servers').send({
        name: 'Original',
        type: 'stdio',
        command: 'node',
        args: [],
      });
      const serverId = createRes.body.id;

      await request(app).put(`/api/servers/${serverId}`).send({ name: 'Updated Name' });

      const res = await request(app).get('/api/audit');
      expect(res.body.entries).toHaveLength(2);
      expect(res.body.entries[0].action).toBe('server_update');
      expect(res.body.entries[0].details?.serverId).toBe(serverId);
      expect(res.body.entries[0].configAfter.servers?.[serverId].name).toBe('Updated Name');
    });

    it('records server reorder in audit log', async () => {
      await request(app).post('/api/servers').send({ name: 'A', type: 'stdio', command: 'node' });
      await request(app).post('/api/servers').send({ name: 'B', type: 'stdio', command: 'node' });
      const listRes = await request(app).get('/api/servers');
      const ids = listRes.body.map((s: { id: string }) => s.id);

      await request(app).patch('/api/servers/reorder').send({ order: ids.reverse() });

      const res = await request(app).get('/api/audit');
      expect(res.body.entries[0].action).toBe('server_reorder');
      expect(res.body.entries[0].details?.order).toEqual(ids);
    });

    it('records server enable toggle in audit log', async () => {
      const createRes = await request(app).post('/api/servers').send({
        name: 'Toggle',
        type: 'stdio',
        command: 'node',
        args: [],
      });
      const serverId = createRes.body.id;

      await request(app).patch(`/api/servers/${serverId}/enabled`).send({ enabled: false });

      const res = await request(app).get('/api/audit');
      expect(res.body.entries[0].action).toBe('server_enable_toggle');
      expect(res.body.entries[0].details?.serverId).toBe(serverId);
      expect(res.body.entries[0].details?.enabled).toBe(false);
    });

    it('records import_custom in audit log', async () => {
      const importPath = path.join(process.cwd(), 'tmp-audit-import-test.json');
      try {
        fs.writeFileSync(
          importPath,
          JSON.stringify({
            mcpServers: {
              imported: { command: 'npx', args: ['-y', 'x'] },
            },
          }),
          'utf8'
        );

        await request(app)
          .post('/api/import/custom')
          .send({ path: importPath, configKey: 'mcpServers' });

        const res = await request(app).get('/api/audit');
        expect(res.body.entries).toHaveLength(1);
        expect(res.body.entries[0].action).toBe('import_custom');
        expect(res.body.entries[0].details?.imported).toBe(1);
        expect(res.body.entries[0].details?.total).toBe(1);
      } finally {
        if (fs.existsSync(importPath)) fs.unlinkSync(importPath);
      }
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
