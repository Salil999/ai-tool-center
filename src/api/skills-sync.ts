import { Router, Request, Response } from '../router.js';
import { getOrderedSkills, syncSkillsToProvider, syncSkillsToProject } from '../skills/sync.js';
import { getSkillProviders } from '../skills/providers.js';
import type { GetConfig } from '../types.js';

export function createSkillsSyncRouter(getConfig: GetConfig) {
  const router = Router();

  router.get('/targets', (_req: Request, res: Response) => {
    const config = getConfig();
    const providers = getSkillProviders(config).map((p) => ({ id: p.id, name: p.name, path: p.path }));
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
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
