import { Router, Request, Response } from '../router.js';
import { PLUGIN_PROVIDERS, getPluginProvider } from '../plugins/index.js';
import type { Plugin } from '../types.js';

export function createPluginsRouter() {
  const router = Router();

  /** List all plugin providers with their metadata. */
  router.get('/providers', (_req: Request, res: Response) => {
    const providers = PLUGIN_PROVIDERS.map(({ id, name, configPath, format }) => ({
      id,
      name,
      configPath,
      format,
    }));
    res.json(providers);
  });

  /** List plugins for a provider. */
  router.get('/:providerId', (req: Request, res: Response) => {
    const provider = getPluginProvider(String(req.params.providerId));
    if (!provider) return res.status(404).json({ error: 'Plugin provider not found' });
    try {
      res.json(provider.listPlugins());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** Replace the full plugin list for a provider. */
  router.put('/:providerId', (req: Request, res: Response) => {
    const provider = getPluginProvider(String(req.params.providerId));
    if (!provider) return res.status(404).json({ error: 'Plugin provider not found' });
    const plugins = (req.body as { plugins?: unknown })?.plugins;
    if (!Array.isArray(plugins)) return res.status(400).json({ error: 'plugins must be an array' });
    try {
      provider.savePlugins(plugins as Plugin[]);
      res.json(provider.listPlugins());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
