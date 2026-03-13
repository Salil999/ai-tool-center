import { Router, Request, Response } from 'express';
import { resolvePath } from '../providers/utils.js';
import { SKILL_PROVIDERS } from '../skills/providers.js';
import {
  discoverSkillSources,
  importFromSkillSource,
  resolveProjectSourcePath,
} from '../skills/import.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createSkillsImportRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/sources', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      const sources = discoverSkillSources(config);
      res.json(sources);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/:source', (req: Request, res: Response) => {
    const config = getConfig();
    const sourceId = String(req.params.source ?? '');

    const projectSourcePath = resolveProjectSourcePath(
      sourceId,
      config.projectDirectories || []
    );
    if (projectSourcePath) {
      try {
        const result = importFromSkillSource(sourceId, projectSourcePath, config);
        saveConfig(config, {
          action: 'skill_import_source',
          details: { sourceId, imported: result.imported, total: result.total, skillIds: result.skillIds },
        });
        return res.json({ success: true, imported: result.imported, total: result.total });
      } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
      }
    }

    const providerConfig = SKILL_PROVIDERS.find((p) => p.id === sourceId);
    if (!providerConfig) {
      return res.status(404).json({ error: `Unknown source: ${sourceId}` });
    }

    try {
      const result = importFromSkillSource(sourceId, providerConfig.path, config);
      saveConfig(config, {
        action: 'skill_import_source',
        details: { sourceId, imported: result.imported, total: result.total, skillIds: result.skillIds },
      });
      res.json({ success: true, imported: result.imported, total: result.total });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/custom', (req: Request, res: Response) => {
    const config = getConfig();
    const { path: dirPath } = (req.body || {}) as { path?: string };

    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      return res.status(400).json({ error: 'path is required' });
    }

    const resolved = resolvePath(dirPath.trim());
    try {
      const result = importFromSkillSource('custom', resolved, config);
      saveConfig(config, {
        action: 'skill_import_custom',
        details: { path: resolved, imported: result.imported, total: result.total, skillIds: result.skillIds },
      });
      res.json({ success: true, imported: result.imported, total: result.total });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
