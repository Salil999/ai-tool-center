import path from 'path';
import { Router, Request, Response } from '../router.js';
import { PROVIDERS, exportToProvider } from '../providers/index.js';
import {
  exportToClaudeUserScope,
  exportToClaudeLocalScope,
  exportToClaudeProjectScope,
} from '../providers/claude.js';
import { exportToOpenCodeProjectScope } from '../providers/opencode.js';
import { isPathSafe, resolvePath, getOrderedServers, exportToMcpPath } from '../providers/utils.js';
import { isProviderEnabled } from '../providers/registry.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;

export function createSyncRouter(getConfig: GetConfig) {
  const router = Router();

  router.get('/targets', (_req: Request, res: Response) => {
    const config = getConfig();
    const builtin = PROVIDERS.filter((p) => isProviderEnabled(p.id, config)).map((p) => ({
      id: p.id,
      name: p.name,
      path: p.getMcpPath(),
    }));
    res.json({ builtin });
  });

  router.post('/:target', (req: Request, res: Response) => {
    const config = getConfig();
    const servers = getOrderedServers(config);
    const targetParam = req.params.target;
    const target = Array.isArray(targetParam) ? targetParam[0] ?? '' : (targetParam ?? '');

    try {
      let result;
      if (target.startsWith('cursor-project-')) {
        const projectId = target.slice('cursor-project-'.length);
        const project = (config.projectDirectories || []).find((p) => p.id === projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const projectPath = resolvePath(project.path);
        if (!isPathSafe(projectPath)) return res.status(400).json({ error: 'Path is not allowed' });
        const mcpPath = path.join(projectPath, '.cursor', 'mcp.json');
        result = exportToMcpPath(servers, mcpPath, 'mcpServers');
      } else if (target === 'claude') {
        result = exportToClaudeUserScope(servers);
      } else if (target.startsWith('claude-local-')) {
        const projectId = target.slice('claude-local-'.length);
        const project = (config.projectDirectories || []).find((p) => p.id === projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const projectPath = resolvePath(project.path);
        if (!isPathSafe(projectPath)) return res.status(400).json({ error: 'Path is not allowed' });
        result = exportToClaudeLocalScope(servers, projectPath);
      } else if (target.startsWith('claude-project-')) {
        const projectId = target.slice('claude-project-'.length);
        const project = (config.projectDirectories || []).find((p) => p.id === projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const projectPath = resolvePath(project.path);
        if (!isPathSafe(projectPath)) return res.status(400).json({ error: 'Path is not allowed' });
        result = exportToClaudeProjectScope(servers, project.path);
      } else if (target.startsWith('opencode-project-')) {
        const projectId = target.slice('opencode-project-'.length);
        const project = (config.projectDirectories || []).find((p) => p.id === projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const projectPath = resolvePath(project.path);
        if (!isPathSafe(projectPath)) return res.status(400).json({ error: 'Path is not allowed' });
        result = exportToOpenCodeProjectScope(servers, project.path);
      } else {
        if (!isProviderEnabled(target, config)) return res.status(400).json({ error: 'Provider is disabled' });
        result = exportToProvider(target, servers);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
