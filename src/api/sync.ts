import { Router, Request, Response } from 'express';
import { PROVIDERS, exportToProvider, exportToCustom } from '../providers/index.js';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;

export function createSyncRouter(getConfig: GetConfig) {
  const router = Router();

  const BUILTIN_TARGETS = PROVIDERS.filter((p) => p.id !== 'claude_desktop').map((p) => ({
    id: p.id,
    name: p.name,
    path: p.getPath(),
  }));

  router.post('/custom', (req: Request, res: Response) => {
    const config = getConfig();
    const servers = config.servers || {};
    const { path: customPath, configKey = 'mcpServers' } = (req.body || {}) as { path?: string; configKey?: string };
    if (!customPath) return res.status(400).json({ error: 'path is required' });
    if (!isPathSafe(resolvePath(customPath))) return res.status(400).json({ error: 'Path is not allowed' });
    try {
      const result = exportToCustom(servers, customPath, configKey);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/targets', (req: Request, res: Response) => {
    const config = getConfig();
    const custom = (config.customProviders || []).map((p) => ({
      id: `custom-${p.id}`,
      name: p.name,
      path: p.path,
      configKey: p.configKey,
    }));
    res.json({ builtin: BUILTIN_TARGETS, custom });
  });

  router.post('/:target', (req: Request, res: Response) => {
    const config = getConfig();
    const servers = config.servers || {};
    const target = req.params.target;

    try {
      let result;
      if (target.startsWith('custom-')) {
        const providerId = target.slice(7);
        const provider = (config.customProviders || []).find((p) => p.id === providerId);
        if (!provider) return res.status(404).json({ error: 'Custom provider not found' });
        result = exportToCustom(servers, provider.path, provider.configKey);
      } else {
        result = exportToProvider(target, servers);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
