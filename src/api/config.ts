import { Router, Request, Response } from '../router.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createConfigRouter(_getConfig: GetConfig, _saveConfig: SaveConfig) {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => res.json({}));
  return router;
}
