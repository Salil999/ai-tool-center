import { Router, Request, Response } from '../router.js';
import crypto from 'crypto';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import type { CustomRuleConfig, GetConfig, SaveConfig } from '../types.js';

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function createCustomRuleConfigsRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const list = config.customRuleConfigs || [];
    res.json(list);
  });

  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const pathArg = body.path as string | undefined;
    const nameArg = body.name as string | undefined;
    const typeArg = body.type as string | undefined;
    const extensionArg = body.extension as string | undefined;

    if (!pathArg || typeof pathArg !== 'string' || !pathArg.trim()) {
      return res.status(400).json({ error: 'path is required' });
    }
    if (!nameArg || typeof nameArg !== 'string' || !nameArg.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const resolved = resolvePath(pathArg.trim());
    if (!isPathSafe(resolved)) {
      return res.status(400).json({ error: 'Path is not allowed' });
    }

    const type = typeArg === 'file' ? 'file' : 'directory';
    const extension = extensionArg === '.mdc' ? '.mdc' : '.md';

    const id = generateId();
    const custom: CustomRuleConfig = {
      id,
      name: nameArg.trim(),
      path: resolved,
      type,
      extension,
    };

    config.customRuleConfigs = config.customRuleConfigs || [];
    config.customRuleConfigs.push(custom);

    saveConfig(config, { action: 'custom_rule_config_add', details: { configId: id } });
    res.status(201).json(custom);
  });

  router.put('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const configId = String(req.params.id ?? '');
    const custom = (config.customRuleConfigs || []).find((c) => c.id === configId);
    if (!custom) return res.status(404).json({ error: 'Custom rule config not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    if (body.path !== undefined) {
      const pathArg = (body.path as string).trim();
      if (!pathArg) return res.status(400).json({ error: 'path cannot be empty' });
      const resolved = resolvePath(pathArg);
      if (!isPathSafe(resolved)) {
        return res.status(400).json({ error: 'Path is not allowed' });
      }
      custom.path = resolved;
    }
    if (body.name !== undefined) {
      custom.name = body.name === null || body.name === '' ? '' : String(body.name);
    }
    if (body.type !== undefined) {
      custom.type = body.type === 'file' ? 'file' : 'directory';
    }
    if (body.extension !== undefined) {
      custom.extension = body.extension === '.mdc' ? '.mdc' : '.md';
    }

    saveConfig(config, { action: 'custom_rule_config_update', details: { configId } });
    res.json(custom);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const configId = String(req.params.id ?? '');
    const idx = (config.customRuleConfigs || []).findIndex((c) => c.id === configId);
    if (idx === -1) return res.status(404).json({ error: 'Custom rule config not found' });

    config.customRuleConfigs!.splice(idx, 1);
    saveConfig(config, { action: 'custom_rule_config_remove', details: { configId } });
    res.status(204).send();
  });

  return router;
}
