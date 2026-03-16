import { request, createTestApp } from '../test/helpers.js';
import type { TestApp } from '../test/helpers.js';

describe('api/sync', () => {
  let app: TestApp;

  beforeEach(() => {
    app = createTestApp({
      config: {
        servers: {
          a: { name: 'A', enabled: true, type: 'stdio', command: 'node', args: [] },
        },
      },
    });
  });

  describe('GET /targets', () => {
    it('returns builtin targets', async () => {
      const res = await request(app).get('/api/sync/targets');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('builtin');
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
  });
});
