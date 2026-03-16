import path from 'path';
import fs from 'fs';
import { request, createTestApp } from '../test/helpers.js';
import type { TestApp } from '../test/helpers.js';

describe('api/import', () => {
  let app: TestApp;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-import-test-'));
    app = createTestApp({
      config: {
        servers: {},
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

});
