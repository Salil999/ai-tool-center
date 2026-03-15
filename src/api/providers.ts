import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import { PROVIDER_CAPABILITIES, getEnabledProviderIds } from '../providers/registry.js';
import type { AppConfig, CustomProvider } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function createProvidersRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const enabled = getEnabledProviderIds(config);

    const builtin = PROVIDER_CAPABILITIES
      .filter((p) => p.id !== 'claude_desktop')
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

    const custom = (config.customProviders || []).map((p) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      configKey: p.configKey,
      enabled: enabled.includes(p.id),
    }));

    res.json({ builtin, custom });
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

  router.post('/custom', (req: Request, res: Response) => {
    const config = getConfig();
    const { name, path: p, configKey } = (req.body || {}) as { name?: string; path?: string; configKey?: string };
    if (!name || !p) return res.status(400).json({ error: 'name and path are required' });

    const resolved = resolvePath(p.trim());
    if (!isPathSafe(resolved)) return res.status(400).json({ error: 'Path is not allowed' });

    const id = `custom-${generateId()}`;
    const provider: CustomProvider = {
      id,
      name: name.trim(),
      path: resolved,
      configKey: configKey || 'mcpServers',
    };

    config.customProviders = config.customProviders || [];
    config.customProviders.push(provider);

    config.enabledProviders = config.enabledProviders ?? getEnabledProviderIds(config);
    if (!config.enabledProviders.includes(id)) {
      config.enabledProviders = [...config.enabledProviders, id];
    }

    saveConfig(config, { action: 'custom_provider_add', details: { providerId: id } });
    res.status(201).json(provider);
  });

  router.put('/custom/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.id ?? '');
    const provider = (config.customProviders || []).find((p) => p.id === providerId);
    if (!provider) return res.status(404).json({ error: 'Custom provider not found' });

    const { name, path: p, configKey } = (req.body || {}) as { name?: string; path?: string; configKey?: string };
    if (name !== undefined) provider.name = String(name).trim();
    if (p !== undefined) {
      const resolved = resolvePath(p.trim());
      if (!isPathSafe(resolved)) return res.status(400).json({ error: 'Path is not allowed' });
      provider.path = resolved;
    }
    if (configKey !== undefined) provider.configKey = configKey || 'mcpServers';

    saveConfig(config, { action: 'custom_provider_update', details: { providerId } });
    res.json(provider);
  });

  router.delete('/custom/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.id ?? '');
    const idx = (config.customProviders || []).findIndex((p) => p.id === providerId);
    if (idx === -1) return res.status(404).json({ error: 'Custom provider not found' });

    config.customProviders!.splice(idx, 1);
    config.enabledProviders = (config.enabledProviders ?? getEnabledProviderIds(config)).filter((id) => id !== providerId);
    saveConfig(config, { action: 'custom_provider_remove', details: { providerId } });
    res.status(204).send();
  });

  return router;
}
