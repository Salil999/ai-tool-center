import { Router, Request, Response } from '../router.js';
import path from 'path';
import fs from 'fs';
import {
  discoverRuleSources,
  importFromProviderToRules,
  importFromProjectSourceToProvider,
  resolveProjectRuleSource,
  importFromProjectSourceToAgent,
  PROJECT_RULE_SUBDIRS,
} from '../rules/import.js';
import { findOrCreateAgentForProjectPath } from './agents-import.js';
import type { GetConfig, SaveConfig } from '../types.js';

const PROVIDER_RULES_IMPORT_IDS = ['cursor'];

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

  /** Import from provider (cursor, vscode, etc.) or project provider path into Rules section. */
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

  /** Auto-import global (home-level) provider rules. */
  router.post('/auto-global', (_req: Request, res: Response) => {
    const config = getConfig();
    let totalRulesImported = 0;

    for (const providerId of PROVIDER_RULES_IMPORT_IDS) {
      try {
        const result = importFromProviderToRules(providerId, config);
        totalRulesImported += result.importedCount;
      } catch {
        // Skip providers that fail
      }
    }

    saveConfig(config, {
      action: 'rule_import_auto_global',
      details: { rulesImported: totalRulesImported },
    });

    res.json({
      success: true,
      imported: {
        rules: totalRulesImported,
        agents: false,
      },
    });
  });

  /** Auto-import all discovered rules for a project (provider rules + AGENTS.md). */
  router.post('/auto/:projectId', (req: Request, res: Response) => {
    const config = getConfig();
    const projectId = String(req.params.projectId ?? '');

    const project = (config.projectDirectories || []).find((p) => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectPath = path.resolve(project.path);
    let totalRulesImported = 0;
    let agentsImported = false;

    // Import provider rules (cursor, vscode, opencode)
    for (const { key, subdir } of PROJECT_RULE_SUBDIRS) {
      const fullPath = path.join(projectPath, ...subdir.split('/'));

      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          const entries = fs.readdirSync(fullPath, { withFileTypes: true });
          const hasFiles = entries.some((e) => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdc')));

          if (hasFiles) {
            const result = importFromProjectSourceToProvider(fullPath, key, config);
            totalRulesImported += result.importedCount;
          }
        }
      } catch (err) {
        // Skip sources that fail - they may not exist or be inaccessible
      }
    }

    // Import AGENTS.md if it exists
    const agentsPath = path.join(projectPath, 'AGENTS.md');
    try {
      if (fs.existsSync(agentsPath) && fs.statSync(agentsPath).isFile()) {
        const content = fs.readFileSync(agentsPath, 'utf8');
        if (content.trim().length > 0) {
          const agentId = findOrCreateAgentForProjectPath(config, projectPath, saveConfig);
          importFromProjectSourceToAgent(agentsPath, agentId, 'agents');
          agentsImported = true;
        }
      }
    } catch (err) {
      // Skip if AGENTS.md doesn't exist or fails to import
    }

    saveConfig(config, {
      action: 'rule_import_auto',
      details: { projectId, rulesImported: totalRulesImported, agentsImported },
    });

    res.json({
      success: true,
      imported: {
        rules: totalRulesImported,
        agents: agentsImported,
      },
    });
  });

  return router;
}
