import { Router, Request, Response } from 'express';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createConfigRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const config = getConfig();
    res.json({
      customProviders: config.customProviders || [],
    });
  });

  router.put('/customProviders', (req: Request, res: Response) => {
    const config = getConfig();
    const providers = req.body;
    if (!Array.isArray(providers)) return res.status(400).json({ error: 'customProviders must be array' });
    config.customProviders = providers;
    saveConfig(config, { action: 'custom_providers_replace', details: { count: providers.length } });
    res.json(config.customProviders);
  });

  router.post('/customProviders', (req: Request, res: Response) => {
    const config = getConfig();
    config.customProviders = config.customProviders || [];
    const { id, name, path: p, configKey } = (req.body || {}) as { id?: string; name?: string; path?: string; configKey?: string };
    if (!name || !p) return res.status(400).json({ error: 'name and path are required' });
    const provider = {
      id: id || `custom-${Date.now()}`,
      name,
      path: p,
      configKey: configKey || 'mcpServers',
    };
    config.customProviders.push(provider);
    saveConfig(config, { action: 'custom_provider_add', details: { providerId: provider.id } });
    res.status(201).json(provider);
  });

  return router;
}
