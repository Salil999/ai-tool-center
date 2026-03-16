import crypto from 'crypto';
import path from 'path';
import { Router, Request, Response } from '../router.js';
import { resolvePath, isPathSafe } from '../providers/utils.js';
import {
  importFromRuleSource,
  importFromCustomPath,
  importFromProjectSourceToAgent,
  resolveProjectAgentSource,
  getProjectPathFromCustomPath,
  discoverAgentSources,
} from '../rules/import.js';
import { writeAgentsForAgent } from '../rules/sync.js';
import type { AppConfig, AgentRule, GetConfig, SaveConfig } from '../types.js';

function projectPathFromSourcePath(sourcePath: string, key: 'agents' | 'claude'): string {
  const resolved = path.resolve(sourcePath);
  return key === 'agents' ? path.dirname(resolved) : path.dirname(path.dirname(resolved));
}

export function findOrCreateAgentForProjectPath(
  config: AppConfig,
  projectPath: string,
  saveConfig: SaveConfig
): string {
  const resolvedProject = path.resolve(projectPath);
  if (!isPathSafe(resolvedProject)) {
    throw new Error('Project path is not allowed');
  }

  const existing = (config.agentRules || []).find(
    (a) => path.resolve(a.projectPath) === resolvedProject
  );
  if (existing) return existing.id;

  const id = crypto.randomBytes(8).toString('hex');
  const agent: AgentRule = {
    id,
    projectPath: resolvedProject,
  };
  config.agentRules = config.agentRules || [];
  config.agentRules.push(agent);
  writeAgentsForAgent(id, '');
  saveConfig(config, { action: 'agent_rule_add', details: { agentId: id, inferred: true } });
  return id;
}

export function createAgentsImportRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/sources', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      const sources = discoverAgentSources(config);
      res.json(sources);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/custom', (req: Request, res: Response) => {
    const config = getConfig();
    const { path: filePath, targetAgentId } = (req.body || {}) as { path?: string; targetAgentId?: string };

    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      return res.status(400).json({ error: 'path is required' });
    }

    const resolved = resolvePath(filePath.trim());
    const projectPath = getProjectPathFromCustomPath(resolved);
    const resolvedTargetId =
      targetAgentId ||
      (projectPath ? findOrCreateAgentForProjectPath(config, projectPath, saveConfig) : null);
    if (!resolvedTargetId) {
      return res.status(400).json({
        error:
          'No AGENTS.md or CLAUDE.md found at that path. Enter a file path (e.g. ~/my-project/AGENTS.md) or a directory that contains AGENTS.md or CLAUDE.md.',
      });
    }

    const targetAgent = (config.agentRules || []).find((a) => a.id === resolvedTargetId);
    if (!targetAgent) {
      return res.status(404).json({ error: 'Target agent rule not found' });
    }

    try {
      importFromCustomPath(resolved, resolvedTargetId);
      saveConfig(config, {
        action: 'agent_import_custom',
        details: { path: resolved, targetAgentId: resolvedTargetId },
      });
      res.json({ success: true });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/:source', (req: Request, res: Response) => {
    const config = getConfig();
    const sourceId = String(req.params.source ?? '');
    const targetAgentId = String(req.body?.targetAgentId ?? req.query.targetAgentId ?? '');

    const projectResolved = resolveProjectAgentSource(sourceId, config.projectDirectories || []);
    if (projectResolved) {
      const { key } = projectResolved;
      const resolvedTargetId =
        targetAgentId ||
        findOrCreateAgentForProjectPath(
          config,
          projectPathFromSourcePath(projectResolved.path, key),
          saveConfig
        );
      const targetAgent = (config.agentRules || []).find((a) => a.id === resolvedTargetId);
      if (!targetAgent) {
        return res.status(404).json({ error: 'Target agent rule not found' });
      }
      try {
        importFromProjectSourceToAgent(projectResolved.path, resolvedTargetId, key);
        saveConfig(config, {
          action: 'agent_import_project',
          details: { sourceId, targetAgentId: resolvedTargetId },
        });
        return res.json({ success: true });
      } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
      }
    }

    const agentSourceTargetId =
      targetAgentId || (sourceId.startsWith('agent-') ? sourceId.replace('agent-', '') : null);
    if (!agentSourceTargetId) {
      return res.status(400).json({ error: 'targetAgentId is required for this source' });
    }

    const targetAgent = (config.agentRules || []).find((a) => a.id === agentSourceTargetId);
    if (!targetAgent) {
      return res.status(404).json({ error: 'Target agent rule not found' });
    }

    try {
      importFromRuleSource(sourceId, agentSourceTargetId, config);
      saveConfig(config, {
        action: 'agent_import_source',
        details: { sourceId, targetAgentId: agentSourceTargetId },
      });
      res.json({ success: true });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
