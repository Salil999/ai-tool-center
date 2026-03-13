import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import { readAgentsForAgent, writeAgentsForAgent } from '../rules/sync.js';
import type { AppConfig, AgentRule } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function createAgentsRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const list = config.agentRules || [];
    res.json(list);
  });

  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const projectPathArg = body.projectPath as string | undefined;
    const nameArg = body.name as string | undefined;
    const contentArg = body.content as string | undefined;

    if (!projectPathArg || typeof projectPathArg !== 'string' || !projectPathArg.trim()) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const resolved = resolvePath(projectPathArg.trim());
    if (!isPathSafe(resolved)) {
      return res.status(400).json({ error: 'Project path is not allowed' });
    }

    const id = generateId();
    const agent: AgentRule = {
      id,
      projectPath: resolved,
      name: nameArg && typeof nameArg === 'string' ? nameArg.trim() : undefined,
    };

    config.agentRules = config.agentRules || [];
    config.agentRules.push(agent);

    writeAgentsForAgent(id, (contentArg && typeof contentArg === 'string' ? contentArg : '').trim());

    saveConfig(config, { action: 'agent_rule_add', details: { agentId: id } });
    res.status(201).json(agent);
  });

  router.get('/:agentId/content', (req: Request, res: Response) => {
    const config = getConfig();
    const agentId = String(req.params.agentId ?? '');
    const agent = (config.agentRules || []).find((a) => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent rule not found' });

    try {
      const content = readAgentsForAgent(agentId);
      res.json({ content });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/:agentId/content', (req: Request, res: Response) => {
    const config = getConfig();
    const agentId = String(req.params.agentId ?? '');
    const agent = (config.agentRules || []).find((a) => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent rule not found' });

    const content = typeof req.body === 'string' ? req.body : (req.body?.content as string ?? '');
    try {
      const contentBefore = readAgentsForAgent(agentId);
      writeAgentsForAgent(agentId, content);
      saveConfig(config, {
        action: 'agent_rule_content_update',
        details: { agentId, contentBefore, contentAfter: content },
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.put('/:agentId', (req: Request, res: Response) => {
    const config = getConfig();
    const agentId = String(req.params.agentId ?? '');
    const agent = (config.agentRules || []).find((a) => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent rule not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    if (body.projectPath !== undefined) {
      const pathArg = (body.projectPath as string).trim();
      if (!pathArg) return res.status(400).json({ error: 'projectPath cannot be empty' });
      const resolved = resolvePath(pathArg);
      if (!isPathSafe(resolved)) {
        return res.status(400).json({ error: 'Project path is not allowed' });
      }
      agent.projectPath = resolved;
    }
    if (body.name !== undefined) {
      agent.name = body.name === null || body.name === '' ? undefined : String(body.name);
    }

    saveConfig(config, { action: 'agent_rule_update', details: { agentId } });
    res.json(agent);
  });

  router.delete('/:agentId', (req: Request, res: Response) => {
    const config = getConfig();
    const agentId = String(req.params.agentId ?? '');
    const idx = (config.agentRules || []).findIndex((a) => a.id === agentId);
    if (idx === -1) return res.status(404).json({ error: 'Agent rule not found' });

    config.agentRules!.splice(idx, 1);
    saveConfig(config, { action: 'agent_rule_remove', details: { agentId } });
    res.status(204).send();
  });

  return router;
}
