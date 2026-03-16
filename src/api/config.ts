import { Router, Request, Response } from '../router.js';
import type { GetConfig, SaveConfig } from '../types.js';

export function createConfigRouter(_getConfig: GetConfig, _saveConfig: SaveConfig) {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => res.json({}));
  return router;
}
