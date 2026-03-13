import path from 'path';
import { Router, Request, Response } from 'express';
import {
  syncAgentsFromAgentToProvider,
  syncAgentsToProject,
  copyAgentsBetweenAgents,
} from '../rules/sync.js';
import { RULES_PROVIDERS, getRuleProviderPath } from '../rules/providers.js';
import { syncProviderRulesToTarget } from '../rules/provider-rules.js';
import type { AppConfig } from '../types.js';
import type { AuditStore } from '../audit/store.js';

type GetConfig = () => AppConfig;

const AGENTS_PROVIDERS = ['claude', 'gemini-cli', 'agents', 'opencode'];

export function createRulesSyncRouter(getConfig: GetConfig, auditStore: AuditStore) {
  const router = Router();

  router.get('/targets', (_req: Request, res: Response) => {
    const config = getConfig();
    const providers = [
      ...RULES_PROVIDERS.map((p) => ({ id: p.id, name: p.name, path: p.path })),
      ...(config.customRuleConfigs || []).map((c) => ({
        id: `custom-${c.id}`,
        name: c.name,
        path: c.path,
      })),
    ];
    const agentProjects = (config.agentRules || []).map((ar) => ({
      id: ar.id,
      name: ar.name || ar.projectPath,
      path: ar.projectPath,
    }));
    const dirProjects = (config.projectDirectories || []).map((pd) => ({
      id: pd.id,
      name: pd.name || pd.path,
      path: pd.path,
    }));
    const agentPaths = new Set(agentProjects.map((p) => p.path));
    const extraFromDirs = dirProjects.filter((p) => !agentPaths.has(p.path));
    const projects = [...agentProjects, ...extraFromDirs];
    res.json({ providers, projects });
  });

  router.post('/:target', (req: Request, res: Response) => {
    const config = getConfig();
    const target = String(req.params.target ?? '');
    const sourceAgentId = String(req.query.sourceAgentId ?? req.body?.sourceAgentId ?? '');

    try {
      let targetPath: string;
      if (target.startsWith('custom-')) {
        const customId = target.replace('custom-', '');
        const custom = (config.customRuleConfigs || []).find((c) => c.id === customId);
        if (!custom) {
          return res.status(400).json({ error: `Unknown target: ${target}` });
        }
        targetPath = custom.path;
      } else {
        const targetInfo = getRuleProviderPath(target);
        if (!targetInfo) {
          return res.status(400).json({ error: `Unknown target: ${target}` });
        }
        targetPath = targetInfo.path;
      }

      if (target === 'cursor' || target === 'augment' || target === 'windsurf' || target === 'continue' || target.startsWith('custom-')) {
        const result = syncProviderRulesToTarget(target, targetPath, config);
        auditStore.record('rule_sync_to_provider', config, config, {
          target,
          path: result.path,
          syncedCount: result.syncedCount,
        });
        return res.json({ path: result.path, success: true, syncedCount: result.syncedCount });
      }

      if (AGENTS_PROVIDERS.includes(target)) {
        if (!sourceAgentId) {
          return res.status(400).json({
            error: 'sourceAgentId required for AGENTS.md sync (claude, gemini-cli, agents, opencode)',
          });
        }
        const agent = (config.agentRules || []).find((a) => a.id === sourceAgentId);
        if (!agent) {
          return res.status(404).json({ error: 'Agent rule not found' });
        }
        const result = syncAgentsFromAgentToProvider(sourceAgentId, target);
        auditStore.record('agent_sync_to_provider', config, config, {
          target,
          sourceAgentId,
          path: result.path,
        });
        return res.json(result);
      }

      return res.status(400).json({ error: `Unknown target: ${target}` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/project/:agentId', (req: Request, res: Response) => {
    const config = getConfig();
    const targetAgentId = String(req.params.agentId ?? '');
    let targetPath: string;
    const targetAgent = (config.agentRules || []).find((a) => a.id === targetAgentId);
    const targetProject = (config.projectDirectories || []).find((pd) => pd.id === targetAgentId);
    if (targetAgent) {
      targetPath = targetAgent.projectPath;
    } else if (targetProject) {
      targetPath = targetProject.path;
    } else {
      return res.status(404).json({ error: 'Project not found' });
    }

    const providerId = String(req.query.providerId ?? '').toLowerCase();
    const sourceAgentId = String(req.query.sourceAgentId ?? req.body?.sourceAgentId ?? '');

    try {
      if (['cursor', 'augment', 'windsurf', 'continue', 'copilot'].includes(providerId)) {
        const rulesTargetPath =
          providerId === 'cursor'
            ? path.join(targetPath, '.cursor', 'rules')
            : providerId === 'augment'
              ? path.join(targetPath, '.augment', 'rules')
              : providerId === 'windsurf'
                ? path.join(targetPath, '.windsurf', 'rules')
                : providerId === 'continue'
                  ? path.join(targetPath, '.continue', 'rules')
                  : path.join(targetPath, '.github', 'copilot-instructions.md');
        const result = syncProviderRulesToTarget(providerId, rulesTargetPath, config);
        auditStore.record('rule_sync_to_project', config, config, {
          targetAgentId,
          providerId,
          path: result.path,
          syncedCount: result.syncedCount,
        });
        return res.json({ path: result.path, success: true, syncedCount: result.syncedCount });
      }

      if (!sourceAgentId) {
        return res.status(400).json({ error: 'sourceAgentId required to copy AGENTS.md to project' });
      }
      const sourceAgent = (config.agentRules || []).find((a) => a.id === sourceAgentId);
      if (!sourceAgent) {
        return res.status(404).json({ error: 'Source agent rule not found' });
      }
      const result = copyAgentsBetweenAgents(sourceAgentId, targetPath);
      auditStore.record('agent_sync_to_project', config, config, {
        targetAgentId,
        sourceAgentId,
        path: result.path,
      });
      return res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
