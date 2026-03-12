import { Router, Request, Response } from 'express';
import { fetchToolsFromServer, OAuthRequiredError } from '../mcp/tools.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createServersRouter(
  getConfig: GetConfig,
  saveConfig: SaveConfig,
  baseUrl = 'http://localhost:3847'
) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const servers = config.servers || {};
    const order = config.serverOrder || Object.keys(servers);
    const orderedIds = order.filter((id) => servers[id]);
    const extraIds = Object.keys(servers).filter((id) => !orderedIds.includes(id));
    const ids = [...orderedIds, ...extraIds];
    const list = ids.map((id) => ({ id, ...servers[id] }));
    res.json(list);
  });

  router.get('/:id/tools', async (req: Request, res: Response) => {
    const config = getConfig();
    const serverId = String(req.params.id ?? '');
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
    const serverId = String(req.params.id ?? '');
    const server = config.servers?.[serverId];
    if (!server) return res.status(404).json({ error: 'Server not found' });
    res.json({ id: serverId, ...server });
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
    if (!config.serverOrder) {
      config.serverOrder = Object.keys(config.servers);
    } else if (!config.serverOrder.includes(finalId)) {
      config.serverOrder.push(finalId);
    }
    saveConfig(config, { action: 'server_create', details: { serverId: finalId } });
    res.status(201).json({ id: finalId, ...server });
  });

  router.put('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const serverId = String(req.params.id ?? '');
    if (!config.servers?.[serverId]) return res.status(404).json({ error: 'Server not found' });
    const body = (req.body || {}) as Record<string, unknown>;
    const server = config.servers[serverId];
    if (body.name !== undefined) server.name = body.name as string;
    if (body.enabled !== undefined) server.enabled = body.enabled as boolean;
    if (body.type !== undefined) server.type = body.type as 'stdio' | 'http' | 'sse';
    if (body.command !== undefined) server.command = body.command as string;
    if (body.args !== undefined) server.args = Array.isArray(body.args) ? body.args : [];
    if (body.env !== undefined) server.env = typeof body.env === 'object' ? (body.env as Record<string, string>) : {};
    if (body.url !== undefined) server.url = body.url as string;
    if (body.headers !== undefined) server.headers = body.headers && typeof body.headers === 'object' ? (body.headers as Record<string, string>) : undefined;
    saveConfig(config, { action: 'server_update', details: { serverId } });
    res.json({ id: serverId, ...server });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const serverId = String(req.params.id ?? '');
    if (!config.servers?.[serverId]) return res.status(404).json({ error: 'Server not found' });
    delete config.servers[serverId];
    if (config.serverOrder) {
      config.serverOrder = config.serverOrder.filter((id) => id !== serverId);
    }
    saveConfig(config, { action: 'server_delete', details: { serverId } });
    res.status(204).send();
  });

  router.patch('/reorder', (req: Request, res: Response) => {
    const config = getConfig();
    const order = (req.body as { order?: string[] })?.order;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of server IDs' });
    const servers = config.servers || {};
    const validOrder = order.filter((id) => servers[id]);
    const extraIds = Object.keys(servers).filter((id) => !validOrder.includes(id));
    config.serverOrder = [...validOrder, ...extraIds];
    saveConfig(config, { action: 'server_reorder', details: { order: config.serverOrder } });
    res.json({ order: config.serverOrder });
  });

  router.patch('/:id/enabled', (req: Request, res: Response) => {
    const config = getConfig();
    const serverId = String(req.params.id ?? '');
    if (!config.servers?.[serverId]) return res.status(404).json({ error: 'Server not found' });
    const enabled = (req.body as { enabled?: boolean })?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    config.servers[serverId].enabled = enabled;
    saveConfig(config, { action: 'server_enable_toggle', details: { serverId, enabled } });
    res.json({ id: serverId, enabled });
  });

  return router;
}
