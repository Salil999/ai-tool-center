import { Router, Request, Response } from 'express';
import {
  discoverRuleSources,
  importFromProviderToRules,
  importFromProjectSourceToProvider,
  resolveProjectRuleSource,
} from '../rules/import.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

const PROVIDER_RULES_IMPORT_IDS = ['cursor', 'augment', 'windsurf', 'continue'];

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

  /** Import from provider (cursor, augment, etc.) or project provider path into Rules section. */
  router.post('/:source/provider', (req: Request, res: Response) => {
    const config = getConfig();
    const sourceId = String(req.params.source ?? '');

    const projectResolved = resolveProjectRuleSource(sourceId, config.projectDirectories || []);
    if (projectResolved?.importToProvider && projectResolved.providerId) {
      try {
        const result = importFromProjectSourceToProvider(
          projectResolved.path,
          projectResolved.providerId,
          config
        );
        saveConfig(config, {
          action: 'rule_import_project_provider',
          details: { sourceId, importedCount: result.importedCount },
        });
        return res.json({ success: true, importedCount: result.importedCount });
      } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
      }
    }

    if (!PROVIDER_RULES_IMPORT_IDS.includes(sourceId)) {
      return res.status(400).json({ error: `Import to provider rules only supports: ${PROVIDER_RULES_IMPORT_IDS.join(', ')}` });
    }

    try {
      const result = importFromProviderToRules(sourceId, config);
      saveConfig(config, {
        action: 'rule_import_provider',
        details: { sourceId, importedCount: result.importedCount },
      });
      res.json({ success: true, importedCount: result.importedCount });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
