import { Router, Request, Response } from 'express';
import { resolvePath } from '../providers/utils.js';
import { discoverRuleSources, importFromRuleSource, importFromCustomPath } from '../rules/import.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

export function createRulesImportRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/sources', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      const sources = discoverRuleSources(config);
      res.json(sources);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/:source', (req: Request, res: Response) => {
    const config = getConfig();
    const sourceId = String(req.params.source ?? '');
    const targetAgentId = String(req.body?.targetAgentId ?? req.query.targetAgentId ?? '');

    if (!targetAgentId) {
      return res.status(400).json({ error: 'targetAgentId is required' });
    }

    const targetAgent = (config.agentRules || []).find((a) => a.id === targetAgentId);
    if (!targetAgent) {
      return res.status(404).json({ error: 'Target agent rule not found' });
    }

    try {
      importFromRuleSource(sourceId, targetAgentId, config);
      saveConfig(config, {
        action: 'rule_import_source',
        details: { sourceId, targetAgentId },
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/custom', (req: Request, res: Response) => {
    const config = getConfig();
    const { path: filePath, targetAgentId } = (req.body || {}) as { path?: string; targetAgentId?: string };

    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      return res.status(400).json({ error: 'path is required' });
    }
    if (!targetAgentId) {
      return res.status(400).json({ error: 'targetAgentId is required' });
    }

    const targetAgent = (config.agentRules || []).find((a) => a.id === targetAgentId);
    if (!targetAgent) {
      return res.status(404).json({ error: 'Target agent rule not found' });
    }

    const resolved = resolvePath(filePath.trim());
    try {
      importFromCustomPath(resolved, targetAgentId);
      saveConfig(config, {
        action: 'rule_import_custom',
        details: { path: resolved, targetAgentId },
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
