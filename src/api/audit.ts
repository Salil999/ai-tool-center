import { Router, Request, Response } from 'express';
import type { AuditStore } from '../audit/store.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createAuditRouter(
  auditStore: AuditStore,
  getConfig: GetConfig,
  saveConfig: SaveConfig
) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({ entries: auditStore.getEntries() });
  });

  router.get('/options', (_req: Request, res: Response) => {
    res.json({ maxEntries: auditStore.getMaxEntries() });
  });

  router.put('/options', (req: Request, res: Response) => {
    const { maxEntries } = req.body || {};
    if (typeof maxEntries === 'number' && maxEntries >= 1) {
      auditStore.setMaxEntries(maxEntries);
      const config = getConfig();
      config.auditOptions = config.auditOptions || {};
      config.auditOptions.maxEntries = maxEntries;
      saveConfig(config, { action: 'audit_options_update', details: { maxEntries } });
      res.json({ maxEntries: auditStore.getMaxEntries() });
    } else {
      res.status(400).json({ error: 'maxEntries must be a number >= 1' });
    }
  });

  router.delete('/', (_req: Request, res: Response) => {
    auditStore.clear();
    res.status(204).send();
  });

  return router;
}
