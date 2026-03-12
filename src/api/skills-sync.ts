import { Router, Request, Response } from 'express';
import { getOrderedSkills, syncSkillsToProvider, syncSkillsToProject, SKILL_PROVIDERS } from '../skills/sync.js';
import type { AppConfig } from '../types.js';
import type { AuditStore } from '../audit/store.js';

type GetConfig = () => AppConfig;

export function createSkillsSyncRouter(getConfig: GetConfig, auditStore: AuditStore) {
  const router = Router();

  router.get('/targets', (_req: Request, res: Response) => {
    const config = getConfig();
    const providers = SKILL_PROVIDERS.map((p) => ({ id: p.id, name: p.name, path: p.path }));
    const projects = (config.projectDirectories || []).map((pd) => ({
      id: pd.id,
      name: pd.name || pd.path,
      path: pd.path,
    }));
    res.json({ providers, projects });
  });

  router.post('/:target', (req: Request, res: Response) => {
    const config = getConfig();
    const target = String(req.params.target ?? '');
    const skills = getOrderedSkills(config);
    const skillPaths = Object.values(skills)
      .filter((s) => s.enabled)
      .map((s) => s.path);

    try {
      const result = syncSkillsToProvider(target, skillPaths);
      auditStore.record('skill_sync_to_provider', config, config, {
        target,
        path: result.path,
        syncedCount: result.syncedCount,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/project/:projectId', (req: Request, res: Response) => {
    const config = getConfig();
    const projectId = String(req.params.projectId ?? '');
    const project = (config.projectDirectories || []).find((pd) => pd.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project directory not found' });

    const skills = getOrderedSkills(config);
    const skillPaths = Object.values(skills)
      .filter((s) => s.enabled)
      .map((s) => s.path);

    try {
      const result = syncSkillsToProject(project.path, skillPaths);
      auditStore.record('skill_sync_to_project', config, config, {
        projectId,
        path: result.path,
        syncedCount: result.syncedCount,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
