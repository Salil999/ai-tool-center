import { Router, Request, Response } from '../router.js';
import { discoverSources, importFromProvider, mergeServers } from '../providers/index.js';
import type { GetConfig, SaveConfig } from '../types.js';

export function createImportRouter(getConfig: GetConfig, saveConfigFn: SaveConfig) {
  const router = Router();

  router.get('/sources', (req: Request, res: Response) => {
    try {
      const sources = discoverSources();
      res.json(sources);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/:source', (req: Request, res: Response) => {
    const config = getConfig();
    const sourceId = req.params.source;

    try {
      const imported = importFromProvider(sourceId);
      const existing = config.servers || {};
      const merged = mergeServers(existing, imported);
      const added = Object.keys(merged).length - Object.keys(existing).length;
      config.servers = merged;
      config.serverOrder = config.serverOrder || Object.keys(existing);
      const newIds = Object.keys(merged).filter((id) => !existing[id]);
      config.serverOrder = [...config.serverOrder, ...newIds];
      saveConfigFn(config, { action: 'import_source', details: { sourceId, imported: added, total: Object.keys(merged).length } });
      res.json({
        success: true,
        imported: added,
        total: Object.keys(merged).length,
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
