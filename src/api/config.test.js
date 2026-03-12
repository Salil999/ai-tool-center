const request = require('supertest');
const { createTestApp } = require('../test/helpers');

describe('api/config', () => {
  let app;

  beforeEach(() => {
    app = createTestApp({
      config: { servers: {}, customProviders: [{ id: 'p1', name: 'Custom 1', path: '/tmp/x', configKey: 'mcpServers' }] },
    });
  });

  describe('GET /', () => {
    it('returns customProviders', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.customProviders).toHaveLength(1);
      expect(res.body.customProviders[0]).toMatchObject({ id: 'p1', name: 'Custom 1' });
    });
  });

  describe('PUT /customProviders', () => {
    it('replaces customProviders', async () => {
      const providers = [{ id: 'new', name: 'New', path: '/tmp/y', configKey: 'mcpServers' }];
      const res = await request(app).put('/api/config/customProviders').send(providers);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(providers);
    });

    it('returns 400 for non-array', async () => {
      const res = await request(app).put('/api/config/customProviders').send('invalid');
      expect(res.status).toBe(400);
    });
  });
});
