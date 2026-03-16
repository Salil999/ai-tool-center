import { Router, Request, Response } from '../router.js';
import { fetchToolsFromServer, OAuthRequiredError } from '../mcp/tools.js';
import { generateIdFromBody, handleReorder, handleToggleEnabled, getOrderedIds } from './route-utils.js';
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
    const ids = getOrderedIds(servers, config.serverOrder);
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
    const finalId = generateIdFromBody(body, Object.keys(config.servers || {}), 'server');
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

  router.patch('/reorder', handleReorder(getConfig, saveConfig, {
    itemsKey: 'servers',
    orderKey: 'serverOrder',
  }));

  router.patch('/:id/enabled', handleToggleEnabled(getConfig, saveConfig, {
    itemsKey: 'servers',
    entityName: 'Server',
  }));

  return router;
}
