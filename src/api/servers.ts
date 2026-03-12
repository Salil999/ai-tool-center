import { Router, Request, Response } from 'express';
import { fetchToolsFromServer, OAuthRequiredError } from '../mcp/tools.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig) => void;

export function createServersRouter(
  getConfig: GetConfig,
  saveConfig: SaveConfig,
  baseUrl = 'http://localhost:3847'
) {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const config = getConfig();
    const servers = config.servers || {};
    const list = Object.entries(servers).map(([id, s]) => ({ id, ...s }));
    res.json(list);
  });

  router.get('/:id/tools', async (req: Request, res: Response) => {
    const config = getConfig();
    const serverId = req.params.id;
    const server = config.servers?.[serverId];
    if (!server) return res.status(404).json({ error: 'Server not found' });
    try {
      const tools = await fetchToolsFromServer(server, { serverId, baseUrl });
      res.json({ tools });
    } catch (err) {
      if (err instanceof OAuthRequiredError || ((err as Error & { code?: string })?.code === 'OAUTH_REQUIRED')) {
        return res.status(401).json({ error: 'OAUTH_REQUIRED', message: (err as Error).message || 'Authorization required.' });
      }
      res.status(500).json({ error: (err as Error).message || 'Failed to fetch tools' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const server = config.servers?.[req.params.id];
    if (!server) return res.status(404).json({ error: 'Server not found' });
    res.json({ id: req.params.id, ...server });
  });

  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const id = ((body.id || body.name || 'server') as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'server';
    const existing = Object.keys(config.servers || {});
    let finalId = id;
    let n = 1;
    while (existing.includes(finalId)) {
      finalId = `${id}-${n++}`;
    }
    const server = {
      name: (body.name as string) || finalId,
      enabled: body.enabled !== false,
      type: (body.type as 'stdio' | 'http' | 'sse') || 'stdio',
      command: body.command as string | undefined,
      args: Array.isArray(body.args) ? body.args : [],
      env: typeof body.env === 'object' ? (body.env as Record<string, string>) : {},
      url: body.url as string | undefined,
      headers: body.headers && typeof body.headers === 'object' ? (body.headers as Record<string, string>) : undefined,
    };
    config.servers = config.servers || {};
    config.servers[finalId] = server;
    saveConfig(config);
    res.status(201).json({ id: finalId, ...server });
  });

  router.put('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    if (!config.servers?.[req.params.id]) return res.status(404).json({ error: 'Server not found' });
    const body = (req.body || {}) as Record<string, unknown>;
    const server = config.servers[req.params.id];
    if (body.name !== undefined) server.name = body.name as string;
    if (body.enabled !== undefined) server.enabled = body.enabled as boolean;
    if (body.type !== undefined) server.type = body.type as 'stdio' | 'http' | 'sse';
    if (body.command !== undefined) server.command = body.command as string;
    if (body.args !== undefined) server.args = Array.isArray(body.args) ? body.args : [];
    if (body.env !== undefined) server.env = typeof body.env === 'object' ? (body.env as Record<string, string>) : {};
    if (body.url !== undefined) server.url = body.url as string;
    if (body.headers !== undefined) server.headers = body.headers && typeof body.headers === 'object' ? (body.headers as Record<string, string>) : undefined;
    saveConfig(config);
    res.json({ id: req.params.id, ...server });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    if (!config.servers?.[req.params.id]) return res.status(404).json({ error: 'Server not found' });
    delete config.servers[req.params.id];
    saveConfig(config);
    res.status(204).send();
  });

  router.patch('/:id/enabled', (req: Request, res: Response) => {
    const config = getConfig();
    if (!config.servers?.[req.params.id]) return res.status(404).json({ error: 'Server not found' });
    const enabled = (req.body as { enabled?: boolean })?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    config.servers[req.params.id].enabled = enabled;
    saveConfig(config);
    res.json({ id: req.params.id, enabled });
  });

  return router;
}
