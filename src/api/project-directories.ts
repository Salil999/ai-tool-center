import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import type { AppConfig, ProjectDirectory } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function createProjectDirectoriesRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const list = config.projectDirectories || [];
    res.json(list);
  });

  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const pathArg = body.path as string | undefined;
    const nameArg = body.name as string | undefined;

    if (!pathArg || typeof pathArg !== 'string' || !pathArg.trim()) {
      return res.status(400).json({ error: 'path is required' });
    }

    const resolved = resolvePath(pathArg.trim());
    if (!isPathSafe(resolved)) {
      return res.status(400).json({ error: 'Path is not allowed' });
    }

    const id = generateId();
    const project: ProjectDirectory = {
      id,
      path: resolved,
      name: nameArg && typeof nameArg === 'string' ? nameArg.trim() : undefined,
    };

    config.projectDirectories = config.projectDirectories || [];
    config.projectDirectories.push(project);

    saveConfig(config, { action: 'project_directory_add', details: { projectId: id } });
    res.status(201).json(project);
  });

  router.put('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const projectId = String(req.params.id ?? '');
    const project = (config.projectDirectories || []).find((pd) => pd.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project directory not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    if (body.path !== undefined) {
      const pathArg = (body.path as string).trim();
      if (!pathArg) return res.status(400).json({ error: 'path cannot be empty' });
      const resolved = resolvePath(pathArg);
      if (!isPathSafe(resolved)) {
        return res.status(400).json({ error: 'Path is not allowed' });
      }
      project.path = resolved;
    }
    if (body.name !== undefined) {
      project.name = body.name === null || body.name === '' ? undefined : String(body.name);
    }

    saveConfig(config, { action: 'project_directory_update', details: { projectId } });
    res.json(project);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const projectId = String(req.params.id ?? '');
    const idx = (config.projectDirectories || []).findIndex((pd) => pd.id === projectId);
    if (idx === -1) return res.status(404).json({ error: 'Project directory not found' });

    config.projectDirectories!.splice(idx, 1);
    saveConfig(config, { action: 'project_directory_remove', details: { projectId } });
    res.status(204).send();
  });

  return router;
}
