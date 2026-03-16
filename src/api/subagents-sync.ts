import { Router, Request, Response } from '../router.js';
import { getSyncTargets, syncSubagentsTo } from '../subagents/sync.js';
import type { GetConfig } from '../types.js';

export function createSubagentsSyncRouter(getConfig: GetConfig) {
  const router = Router();

  // List sync targets
  router.get('/targets', (_req: Request, res: Response) => {
    const config = getConfig();
    const targets = getSyncTargets(config);
    res.json(targets);
  });

  // Sync to a target (targetId in body because IDs can contain slashes)
  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const targetId = String((req.body as { targetId?: string })?.targetId ?? '');
    if (!targetId) return res.status(400).json({ error: 'targetId is required' });
    const targets = getSyncTargets(config);

    const allTargets = [...targets.providers, ...targets.projects];
    const target = allTargets.find((t) => t.id === targetId);
    if (!target) {
      return res.status(404).json({ error: `Sync target not found: ${targetId}` });
    }

    try {
      const result = syncSubagentsTo(target.path, config);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
