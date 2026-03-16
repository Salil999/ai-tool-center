import { Router, Request, Response } from '../router.js';
import { discoverGlobalSources, discoverProjectSources, importSubagentsFromDir } from '../subagents/sync.js';
import type { GetConfig, SaveConfig } from '../types.js';

export function createSubagentsImportRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  // Discover available import sources
  router.get('/sources', (_req: Request, res: Response) => {
    const config = getConfig();
    const providers = discoverGlobalSources();
    const projects = discoverProjectSources(config);
    res.json({ providers, projects });
  });

  // Import from a discovered source by ID
  router.post('/:sourceId', (req: Request, res: Response) => {
    const config = getConfig();
    const sourceId = String(req.params.sourceId ?? '');

    // Find the source path from global or project sources
    const globalSources = discoverGlobalSources();
    const projectSources = discoverProjectSources(config);

    let sourcePath: string | null = null;
    const globalMatch = globalSources.find((s) => s.id === sourceId);
    if (globalMatch?.exists) {
      sourcePath = globalMatch.path;
    } else {
      for (const project of projectSources) {
        const match = project.sources.find((s) => s.id === sourceId);
        if (match?.exists) {
          sourcePath = match.path;
          break;
        }
      }
    }

    if (!sourcePath) {
      return res.status(404).json({ error: `Import source not found: ${sourceId}` });
    }

    try {
      const result = importSubagentsFromDir(sourcePath, config);
      saveConfig(config, {
        action: 'subagent_import',
        details: { sourceId, imported: result.imported, total: result.total },
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
