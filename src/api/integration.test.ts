/**
 * Integration tests for end-to-end flows: add MCP server → verify visibility,
 * round-trip persistence → remove → verify gone.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../index.js';
import { request } from '../test/helpers.js';
import type { TestApp } from '../test/helpers.js';

vi.mock('../mcp/tools.js', () => ({
  fetchToolsFromServer: vi.fn().mockResolvedValue([{ name: 'test_tool' }]),
  OAuthRequiredError: class OAuthRequiredError extends Error {
    code = 'OAUTH_REQUIRED';
    constructor(msg: string) {
      super(msg);
    }
  },
}));

describe('integration: MCP server add/remove flow', () => {
  let app: TestApp;
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
    configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ servers: {}, skills: {}, skillOrder: [], projectDirectories: [] }),
      'utf8'
    );
    process.env.AI_TOOLS_MANAGER_SKILLS_DIR = path.join(tmpDir, 'skills');
    fs.mkdirSync(path.join(tmpDir, 'skills'), { recursive: true });
    app = createApp({ configPath });
  });

  afterEach(() => {
    delete process.env.AI_TOOLS_MANAGER_SKILLS_DIR;
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it('add MCP server → see it in list, round-trip persistence → remove → gone', async () => {
    const serverPayload = {
      name: 'My MCP Server',
      type: 'stdio' as const,
      command: 'npx',
      args: ['-y', 'some-mcp-server'],
    };

    // 1. Add server
    const createRes = await request(app).post('/api/servers').send(serverPayload);
    expect(createRes.status).toBe(201);
    const created = createRes.body;
    expect(created).toMatchObject({
      name: 'My MCP Server',
      command: 'npx',
      args: ['-y', 'some-mcp-server'],
      enabled: true,
      type: 'stdio',
    });
    expect(created.id).toBeDefined();
    const serverId = created.id;

    // 2. Verify server appears in list (visibility)
    const listRes = await request(app).get('/api/servers');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    const listed = listRes.body[0];
    expect(listed.id).toBe(serverId);
    expect(listed.name).toBe('My MCP Server');
    expect(listed.command).toBe('npx');
    expect(listed.args).toEqual(['-y', 'some-mcp-server']);

    // 3. Verify round-trip: what we saved is what we see (GET by id)
    const getRes = await request(app).get(`/api/servers/${serverId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toMatchObject({
      id: serverId,
      name: 'My MCP Server',
      command: 'npx',
      args: ['-y', 'some-mcp-server'],
      enabled: true,
      type: 'stdio',
    });

    // 4. Remove server
    const deleteRes = await request(app).delete(`/api/servers/${serverId}`);
    expect(deleteRes.status).toBe(204);

    // 5. Verify server no longer in list
    const listAfterRes = await request(app).get('/api/servers');
    expect(listAfterRes.status).toBe(200);
    expect(listAfterRes.body).toHaveLength(0);

    // 6. Verify 404 when fetching removed server
    const getAfterRes = await request(app).get(`/api/servers/${serverId}`);
    expect(getAfterRes.status).toBe(404);
  });

  it('persists across app restart: add server, restart, still visible', async () => {
    const createRes = await request(app).post('/api/servers').send({
      name: 'Persistent Server',
      type: 'stdio',
      command: 'node',
      args: ['server.js'],
    });
    expect(createRes.status).toBe(201);
    const serverId = createRes.body.id;

    // Simulate restart: create new app instance with same config
    const app2 = createApp({ configPath });

    const listRes = await request(app2).get('/api/servers');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(serverId);
    expect(listRes.body[0].name).toBe('Persistent Server');
  });
});
