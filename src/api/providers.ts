import { Router, Request, Response } from '../router.js';
import { PROVIDER_CAPABILITIES, getEnabledProviderIds } from '../providers/registry.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createProvidersRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const enabled = getEnabledProviderIds(config);

    const SUPPORTED_PROVIDER_IDS = new Set(['cursor', 'claude', 'vscode', 'opencode']);

    const builtin = PROVIDER_CAPABILITIES
      .filter((p) => SUPPORTED_PROVIDER_IDS.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        path: p.rulesTarget?.path || p.skillsPath || '',
        enabled: enabled.includes(p.id),
        capabilities: {
          mcp: p.mcp,
          skills: !!p.skillsPath,
          rules: !!p.rulesTarget,
        },
      }));

    res.json({ builtin });
  });

  router.patch('/enabled', (req: Request, res: Response) => {
    const config = getConfig();
    const { enabledProviders } = (req.body || {}) as { enabledProviders?: string[] };
    if (!Array.isArray(enabledProviders)) {
      return res.status(400).json({ error: 'enabledProviders must be an array' });
    }
    config.enabledProviders = enabledProviders;
    saveConfig(config, { action: 'providers_enabled_update', details: { count: enabledProviders.length } });
    res.json({ enabledProviders: config.enabledProviders });
  });

  return router;
}
