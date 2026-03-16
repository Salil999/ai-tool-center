import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from '../router.js';
import { isPathSafe } from '../providers/utils.js';
import { parseSubagentFile, parseSubagentContent } from '../subagents/parse.js';
import { lintSubagentFile, lintSubagentContent, lintSubagentContentAllProviders } from '../subagents/lint.js';
import { SUBAGENT_PROVIDER_IDS, getSubagentProvider } from '../subagents/providers.js';
import { getOrderedSubagents, isDuplicateSubagent, getManagedSubagentsDir } from '../subagents/sync.js';
import { slugify, uniqueId } from '../utils/slugify.js';
import { handleReorder, handleToggleEnabled } from './route-utils.js';
import type { Subagent, GetConfig, SaveConfig } from '../types.js';

export function createSubagentsRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  // List all subagents (ordered)
  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const subagents = getOrderedSubagents(config);
    const list = Object.entries(subagents).map(([id, s]) => {
      let description: string | undefined;
      let name = s.name;
      try {
        const parsed = parseSubagentFile(s.path);
        description = parsed.metadata.description;
        if (parsed.metadata.name) name = parsed.metadata.name;
      } catch {
        description = undefined;
      }
      return { id, ...s, name, description };
    });
    res.json(list);
  });

  // List registered provider IDs and names (for dynamic UI rendering)
  router.get('/providers', (_req: Request, res: Response) => {
    const providers = SUBAGENT_PROVIDER_IDS.map((id) => {
      const p = getSubagentProvider(id)!;
      return { id: p.id, name: p.name };
    });
    res.json(providers);
  });

  // Validate content (must be before /:id routes)
  router.post('/validate-content', (req: Request, res: Response) => {
    const content = (req.body?.content as string) ?? '';
    const provider = (req.body?.provider as string) ?? '';
    try {
      if (provider && getSubagentProvider(provider)) {
        res.json(lintSubagentContent(content, provider));
      } else {
        const reports = lintSubagentContentAllProviders(content);
        res.json(reports);
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get subagent file content
  router.get('/:id/content', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    const subagent = config.subagents?.[subagentId];
    if (!subagent) return res.status(404).json({ error: 'Subagent not found' });
    if (!fs.existsSync(subagent.path)) return res.status(404).json({ error: 'Subagent file not found' });
    const content = fs.readFileSync(subagent.path, 'utf8');
    res.json({ content });
  });

  // Save subagent file content
  router.put('/:id/content', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    const subagent = config.subagents?.[subagentId];
    if (!subagent) return res.status(404).json({ error: 'Subagent not found' });
    if (!isPathSafe(subagent.path)) return res.status(400).json({ error: 'Path is not allowed' });
    const content = typeof req.body === 'string' ? req.body : (req.body?.content as string ?? '');
    fs.writeFileSync(subagent.path, content, 'utf8');
    res.json({ success: true });
  });

  // Lint a saved subagent
  router.get('/:id/lint', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    const subagent = config.subagents?.[subagentId];
    if (!subagent) return res.status(404).json({ error: 'Subagent not found' });
    try {
      const reports: Record<string, unknown> = {};
      for (const id of SUBAGENT_PROVIDER_IDS) {
        reports[id] = lintSubagentFile(subagent.path, id);
      }
      res.json(reports);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Lint content of an existing subagent (without saving)
  router.post('/:id/lint-content', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    const subagent = config.subagents?.[subagentId];
    if (!subagent) return res.status(404).json({ error: 'Subagent not found' });
    const content = (req.body?.content as string) ?? '';
    try {
      const reports = lintSubagentContentAllProviders(content);
      res.json(reports);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get single subagent
  router.get('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    const subagent = config.subagents?.[subagentId];
    if (!subagent) return res.status(404).json({ error: 'Subagent not found' });
    try {
      const parsed = parseSubagentFile(subagent.path);
      res.json({
        id: subagentId,
        ...subagent,
        description: parsed.metadata.description,
        metadata: parsed.metadata,
        body: parsed.body,
      });
    } catch {
      res.json({ id: subagentId, ...subagent });
    }
  });

  // Create subagent
  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const contentArg = body.content as string | undefined;

    if (!contentArg || typeof contentArg !== 'string' || !contentArg.trim()) {
      return res.status(400).json({ error: 'content (markdown with YAML frontmatter) is required' });
    }

    let parsed: ReturnType<typeof parseSubagentContent>;
    let subagentName: string;
    try {
      parsed = parseSubagentContent(contentArg.trim());
      subagentName = parsed.metadata.name || 'subagent';
    } catch (err) {
      return res.status(400).json({ error: 'Invalid subagent content: ' + (err as Error).message });
    }

    if (isDuplicateSubagent(subagentName, config.subagents || {})) {
      return res.status(400).json({ error: `Subagent "${subagentName}" already exists` });
    }

    const finalId = uniqueId(slugify(subagentName, 'subagent'), Object.keys(config.subagents || {}));
    const filePath = path.join(getManagedSubagentsDir(), `${finalId}.md`);

    if (fs.existsSync(filePath)) {
      return res.status(400).json({ error: `Subagent file already exists at ${filePath}` });
    }

    fs.writeFileSync(filePath, contentArg.trim(), 'utf8');

    const subagent: Omit<Subagent, 'id'> = {
      path: filePath,
      name: subagentName,
      enabled: body.enabled !== false,
    };

    config.subagents = config.subagents || {};
    config.subagents[finalId] = subagent;
    config.subagentOrder = config.subagentOrder || [];
    if (!config.subagentOrder.includes(finalId)) {
      config.subagentOrder.push(finalId);
    }

    saveConfig(config, {
      action: 'subagent_create',
      details: { subagentId: finalId, subagentName },
    });
    res.status(201).json({ id: finalId, ...subagent });
  });

  // Update subagent metadata
  router.put('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    if (!config.subagents?.[subagentId]) return res.status(404).json({ error: 'Subagent not found' });
    const body = (req.body || {}) as Record<string, unknown>;
    const subagent = config.subagents[subagentId];
    const changedFields: string[] = [];

    if (body.enabled !== undefined) {
      subagent.enabled = body.enabled as boolean;
      changedFields.push('enabled');
    }
    if (body.name !== undefined) {
      subagent.name = body.name as string;
      changedFields.push('name');
    }

    saveConfig(config, {
      action: 'subagent_update',
      details: { subagentId, subagentName: subagent.name, changedFields },
    });
    res.json({ id: subagentId, ...subagent });
  });

  // Delete subagent
  router.delete('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const subagentId = String(req.params.id ?? '');
    if (!config.subagents?.[subagentId]) return res.status(404).json({ error: 'Subagent not found' });
    const subagentName = config.subagents[subagentId].name;
    const subagentPath = config.subagents[subagentId].path;

    delete config.subagents[subagentId];
    if (config.subagentOrder) {
      config.subagentOrder = config.subagentOrder.filter((id) => id !== subagentId);
    }

    // Delete the file if it's in our managed directory
    if (isPathSafe(subagentPath) && fs.existsSync(subagentPath) && subagentPath.startsWith(getManagedSubagentsDir())) {
      fs.unlinkSync(subagentPath);
    }

    saveConfig(config, { action: 'subagent_delete', details: { subagentId, subagentName } });
    res.status(204).send();
  });

  // Reorder
  router.patch('/reorder', handleReorder(getConfig, saveConfig, {
    itemsKey: 'subagents',
    orderKey: 'subagentOrder',
  }));

  // Toggle enabled
  router.patch('/:id/enabled', handleToggleEnabled(getConfig, saveConfig, {
    itemsKey: 'subagents',
    entityName: 'Subagent',
  }));

  return router;
}
