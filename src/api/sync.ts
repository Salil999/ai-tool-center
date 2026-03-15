import path from 'path';
import { Router, Request, Response } from 'express';
import { PROVIDERS, exportToProvider, exportToCustom } from '../providers/index.js';
import {
  exportToClaudeUserScope,
  exportToClaudeLocalScope,
  exportToClaudeProjectScope,
} from '../providers/claude.js';
import { isPathSafe, resolvePath, getOrderedServers } from '../providers/utils.js';
import { isProviderEnabled } from '../providers/registry.js';
import type { AppConfig } from '../types.js';
import type { AuditStore } from '../audit/store.js';

type GetConfig = () => AppConfig;

export function createSyncRouter(getConfig: GetConfig, auditStore: AuditStore) {
  const router = Router();

  router.post('/custom', (req: Request, res: Response) => {
    const config = getConfig();
    const servers = getOrderedServers(config);
    const { path: customPath, configKey = 'mcpServers' } = (req.body || {}) as { path?: string; configKey?: string };
    if (!customPath) return res.status(400).json({ error: 'path is required' });
    if (!isPathSafe(resolvePath(customPath))) return res.status(400).json({ error: 'Path is not allowed' });
    try {
      const result = exportToCustom(servers, customPath, configKey);
      auditStore.record('sync_to_custom', config, config, { path: result.path, configKey });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/targets', (_req: Request, res: Response) => {
    const config = getConfig();
    const builtin = PROVIDERS.filter(
      (p) => p.id !== 'claude_desktop' && isProviderEnabled(p.id, config)
    ).map((p) => ({
      id: p.id,
      name: p.name,
      path: p.getMcpPath(),
    }));
    const custom = (config.customProviders || [])
      .filter((p) => isProviderEnabled(p.id, config))
      .map((p) => ({
        id: `custom-${p.id}`,
        name: p.name,
        path: p.path,
        configKey: p.configKey,
      }));
    res.json({ builtin, custom });
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
        result = exportToCustom(servers, mcpPath, 'mcpServers');
        auditStore.record('sync_to_provider', config, config, {
          target: 'cursor-project',
          projectId,
          path: result.path,
        });
      } else if (target === 'claude') {
        result = exportToClaudeUserScope(servers);
        auditStore.record('sync_to_provider', config, config, { target: 'claude-user', path: result.path });
      } else if (target.startsWith('claude-local-')) {
        const projectId = target.slice('claude-local-'.length);
        const project = (config.projectDirectories || []).find((p) => p.id === projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const projectPath = resolvePath(project.path);
        if (!isPathSafe(projectPath)) return res.status(400).json({ error: 'Path is not allowed' });
        result = exportToClaudeLocalScope(servers, projectPath);
        auditStore.record('sync_to_provider', config, config, {
          target: 'claude-local',
          projectId,
          path: result.path,
        });
      } else if (target.startsWith('claude-project-')) {
        const projectId = target.slice('claude-project-'.length);
        const project = (config.projectDirectories || []).find((p) => p.id === projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const projectPath = resolvePath(project.path);
        if (!isPathSafe(projectPath)) return res.status(400).json({ error: 'Path is not allowed' });
        result = exportToClaudeProjectScope(servers, project.path);
        auditStore.record('sync_to_provider', config, config, {
          target: 'claude-project',
          projectId,
          path: result.path,
        });
      } else if (target.startsWith('custom-')) {
        const providerId = target.slice(7);
        const provider = (config.customProviders || []).find((p) => p.id === providerId);
        if (!provider) return res.status(404).json({ error: 'Custom provider not found' });
        if (!isProviderEnabled(provider.id, config)) return res.status(400).json({ error: 'Provider is disabled' });
        result = exportToCustom(servers, provider.path, provider.configKey);
        auditStore.record('sync_to_custom', config, config, {
          providerId,
          path: result.path,
          configKey: provider.configKey,
        });
      } else {
        if (!isProviderEnabled(target, config)) return res.status(400).json({ error: 'Provider is disabled' });
        result = exportToProvider(target, servers);
        auditStore.record('sync_to_provider', config, config, { target, path: result.path });
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
