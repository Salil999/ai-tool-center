import { request, createTestApp } from '../test/helpers.js';
import type { TestApp } from '../test/helpers.js';

describe('api/config', () => {
  let app: TestApp;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /', () => {
    it('returns empty object', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
  });
});
