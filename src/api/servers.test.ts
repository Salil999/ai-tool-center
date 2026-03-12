import request from 'supertest';
import { createTestApp } from '../test/helpers.js';
import type { Express } from 'express';

vi.mock('../mcp/tools.js', () => ({
  fetchToolsFromServer: vi.fn().mockResolvedValue([{ name: 'test_tool' }]),
  OAuthRequiredError: class OAuthRequiredError extends Error {
    code = 'OAUTH_REQUIRED';
    constructor(msg: string) {
      super(msg);
    }
  },
}));

describe('api/servers', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp({ config: { servers: {}, customProviders: [] } });
  });

  describe('GET /', () => {
    it('returns empty list when no servers', async () => {
      const res = await request(app).get('/api/servers');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns server list', async () => {
      await request(app).post('/api/servers').send({
        name: 'Test',
        command: 'npx',
        args: ['-y', 'x'],
      });
      const res = await request(app).get('/api/servers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Test', command: 'npx' });
    });
  });

  describe('POST /', () => {
    it('creates server with defaults', async () => {
      const res = await request(app).post('/api/servers').send({
        name: 'My Server',
        command: 'npx',
        args: ['-y', 'mcp-server'],
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'My Server',
        command: 'npx',
        args: ['-y', 'mcp-server'],
        enabled: true,
        type: 'stdio',
      });
      expect(res.body.id).toBe('my-server');
    });

    it('suffixes id on collision', async () => {
      await request(app).post('/api/servers').send({ name: 'x', command: 'node' });
      const res = await request(app).post('/api/servers').send({ name: 'x', command: 'node' });
      expect(res.body.id).toBe('x-1');
    });

    it('creates http server with url', async () => {
      const res = await request(app).post('/api/servers').send({
        name: 'HTTP',
        type: 'http',
        url: 'https://example.com',
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ type: 'http', url: 'https://example.com' });
    });
  });

  describe('GET /:id', () => {
    it('returns 404 for unknown server', async () => {
      const res = await request(app).get('/api/servers/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Server not found');
    });

    it('returns server by id', async () => {
      await request(app).post('/api/servers').send({ name: 'A', command: 'node' });
      const res = await request(app).get('/api/servers/a');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'a', name: 'A', command: 'node' });
    });
  });

  describe('PUT /:id', () => {
    it('updates server', async () => {
      await request(app).post('/api/servers').send({ name: 'A', command: 'node' });
      const res = await request(app).put('/api/servers/a').send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('returns 404 for unknown server', async () => {
      const res = await request(app).put('/api/servers/unknown').send({ name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes server', async () => {
      await request(app).post('/api/servers').send({ name: 'A', command: 'node' });
      const res = await request(app).delete('/api/servers/a');
      expect(res.status).toBe(204);
      const list = await request(app).get('/api/servers');
      expect(list.body).toHaveLength(0);
    });

    it('returns 404 for unknown server', async () => {
      const res = await request(app).delete('/api/servers/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /reorder', () => {
    it('reorders servers', async () => {
      await request(app).post('/api/servers').send({ name: 'A', command: 'node' });
      await request(app).post('/api/servers').send({ name: 'B', command: 'node' });
      await request(app).post('/api/servers').send({ name: 'C', command: 'node' });
      const res = await request(app).patch('/api/servers/reorder').send({
        order: ['c', 'a', 'b'],
      });
      expect(res.status).toBe(200);
      expect(res.body.order).toEqual(['c', 'a', 'b']);
      const list = await request(app).get('/api/servers');
      expect(list.body.map((s: { id: string }) => s.id)).toEqual(['c', 'a', 'b']);
    });

    it('returns 400 for invalid order', async () => {
      const res = await request(app).patch('/api/servers/reorder').send({ order: 'not-array' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /:id/enabled', () => {
    it('toggles enabled', async () => {
      await request(app).post('/api/servers').send({ name: 'A', command: 'node' });
      const res = await request(app).patch('/api/servers/a/enabled').send({ enabled: false });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'a', enabled: false });
    });

    it('returns 400 for invalid enabled', async () => {
      await request(app).post('/api/servers').send({ name: 'A', command: 'node' });
      const res = await request(app).patch('/api/servers/a/enabled').send({ enabled: 'yes' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /:id/tools', () => {
    it.skip('returns tools from server (requires MCP mock)', async () => {
      const res = await request(app).post('/api/servers').send({
        name: 'ToolServer',
        command: 'npx',
        args: ['-y', 'x'],
      });
      const serverId = res.body.id;
      const toolsRes = await request(app).get(`/api/servers/${serverId}/tools`);
      expect(toolsRes.status).toBe(200);
      expect(toolsRes.body.tools).toHaveLength(1);
      expect(toolsRes.body.tools[0].name).toBe('test_tool');
    });

    it('returns 404 for unknown server', async () => {
      const res = await request(app).get('/api/servers/unknown/tools');
      expect(res.status).toBe(404);
    });
  });
});
