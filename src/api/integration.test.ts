/**
 * Integration tests for end-to-end flows: add MCP server → verify visibility,
 * audit log, round-trip persistence → remove → verify gone and audit entry.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from '../index.js';
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

describe('integration: MCP server add/remove flow', () => {
  let app: Express;
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
    configPath = path.join(tmpDir, 'config.json');
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

  it('add MCP server → see it in list, audit log, round-trip persistence → remove → gone and audit entry', async () => {
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

    // 3. Verify audit log has server_create entry
    const auditRes = await request(app).get('/api/audit');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.entries).toHaveLength(1);
    const auditEntry = auditRes.body.entries[0];
    expect(auditEntry.action).toBe('server_create');
    expect(auditEntry.details?.serverId).toBe(serverId);
    expect(auditEntry.timestamp).toBeDefined();
    expect(auditEntry.configBefore).toBeDefined();
    expect(auditEntry.configAfter).toBeDefined();
    expect(auditEntry.configAfter.servers?.[serverId]).toMatchObject(serverPayload);

    // 4. Verify round-trip: what we saved is what we see (GET by id)
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

    // 5. Remove server
    const deleteRes = await request(app).delete(`/api/servers/${serverId}`);
    expect(deleteRes.status).toBe(204);

    // 6. Verify server no longer in list
    const listAfterRes = await request(app).get('/api/servers');
    expect(listAfterRes.status).toBe(200);
    expect(listAfterRes.body).toHaveLength(0);

    // 7. Verify 404 when fetching removed server
    const getAfterRes = await request(app).get(`/api/servers/${serverId}`);
    expect(getAfterRes.status).toBe(404);

    // 8. Verify audit log has server_delete entry
    const auditAfterRes = await request(app).get('/api/audit');
    expect(auditAfterRes.body.entries).toHaveLength(2);
    const deleteAuditEntry = auditAfterRes.body.entries[0];
    expect(deleteAuditEntry.action).toBe('server_delete');
    expect(deleteAuditEntry.details?.serverId).toBe(serverId);
  });

  it('persists across app restart: add server, restart, still visible and in audit', async () => {
    const createRes = await request(app).post('/api/servers').send({
      name: 'Persistent Server',
      type: 'stdio',
      command: 'node',
      args: ['server.js'],
    });
    expect(createRes.status).toBe(201);
    const serverId = createRes.body.id;

    // Simulate restart: create new app instance with same config/audit dir
    const app2 = createApp({ configPath, auditDir: tmpDir });

    const listRes = await request(app2).get('/api/servers');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(serverId);
    expect(listRes.body[0].name).toBe('Persistent Server');

    const auditRes = await request(app2).get('/api/audit');
    expect(auditRes.body.entries).toHaveLength(1);
    expect(auditRes.body.entries[0].action).toBe('server_create');
    expect(auditRes.body.entries[0].details?.serverId).toBe(serverId);
  });
});
