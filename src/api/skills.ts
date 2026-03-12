import path from 'path';
import fs from 'fs';
import os from 'os';
import { Router, Request, Response } from 'express';
import { isPathSafe, resolvePath } from '../providers/utils.js';
import { parseSkillDir, parseSkillContent, validateSkillDir } from '../skills/parse.js';
import { lintSkill, lintSkillContent } from '../skills/lint.js';
import { getOrderedSkills, copySkillInto } from '../skills/sync.js';
import type { AppConfig, Skill } from '../types.js';
import type { AuditStore } from '../audit/store.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

const MANAGED_SKILLS_DIR = path.join(os.homedir(), '.ai_tools_manager', 'skills');

function toSkillId(name: string): string {
  return (name || 'skill').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'skill';
}

export function createSkillsRouter(getConfig: GetConfig, saveConfig: SaveConfig, auditStore: AuditStore) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = getConfig();
    const skills = getOrderedSkills(config);
    const list = Object.entries(skills).map(([id, s]) => {
      let description: string | undefined;
      let name = s.name;
      try {
        const parsed = parseSkillDir(s.path);
        description = parsed.metadata.description;
        if (parsed.metadata.name) name = parsed.metadata.name;
      } catch {
        description = undefined;
      }
      return { id, ...s, name, description };
    });
    res.json(list);
  });

  // Must be before /:id routes so /validate-content isn't captured as id
  router.post('/validate-content', (req: Request, res: Response) => {
    const content = (req.body?.content as string) ?? '';
    try {
      const report = lintSkillContent(content);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id/content', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    const skill = config.skills?.[skillId];
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const skillMdPath = path.join(skill.path, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) return res.status(404).json({ error: 'SKILL.md not found' });
    const content = fs.readFileSync(skillMdPath, 'utf8');
    res.json({ content });
  });

  router.put('/:id/content', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    const skill = config.skills?.[skillId];
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const skillMdPath = path.join(skill.path, 'SKILL.md');
    if (!isPathSafe(skillMdPath)) return res.status(400).json({ error: 'Path is not allowed' });
    const contentAfter = typeof req.body === 'string' ? req.body : (req.body?.content as string ?? '');
    const contentBefore = fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, 'utf8') : '';
    fs.writeFileSync(skillMdPath, contentAfter, 'utf8');
    auditStore.record('skill_content_update', config, config, {
      skillId,
      skillName: skill.name,
      contentBefore,
      contentAfter,
    });
    res.json({ success: true });
  });

  router.get('/:id/lint', async (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    const skill = config.skills?.[skillId];
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    try {
      const report = await lintSkill(skill.path);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/:id/lint-content', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    const skill = config.skills?.[skillId];
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const content = (req.body?.content as string) ?? '';
    const dirName = path.basename(skill.path);
    try {
      const report = lintSkillContent(content, dirName);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    const skill = config.skills?.[skillId];
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    try {
      const parsed = parseSkillDir(skill.path);
      res.json({
        id: skillId,
        ...skill,
        description: parsed.metadata.description,
        metadata: parsed.metadata,
        body: parsed.body,
      });
    } catch {
      res.json({ id: skillId, ...skill });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const pathArg = body.path as string | undefined;
    const contentArg = body.content as string | undefined;

    let skillPath: string;
    let skillName: string;
    let finalId: string;

    if (pathArg && pathArg.trim()) {
      const resolved = resolvePath(pathArg.trim());
      if (!isPathSafe(resolved)) {
        return res.status(400).json({ error: 'Path is not allowed' });
      }
      if (!validateSkillDir(resolved)) {
        return res.status(400).json({ error: 'Directory does not contain SKILL.md' });
      }
      let parsed: { metadata: { name?: string; description?: string } };
      try {
        parsed = parseSkillDir(resolved);
        skillName = parsed.metadata.name || path.basename(resolved);
      } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
      }
      const id = toSkillId(skillName);
      const existing = Object.keys(config.skills || {});
      finalId = id;
      let n = 1;
      while (existing.includes(finalId)) {
        finalId = `${id}-${n++}`;
      }
      const centralPath = path.join(MANAGED_SKILLS_DIR, finalId);
      copySkillInto(resolved, centralPath);
      skillPath = centralPath;
    } else if (contentArg && typeof contentArg === 'string' && contentArg.trim()) {
      let parsed: { metadata: { name?: string } };
      try {
        parsed = parseSkillContent(contentArg.trim());
        skillName = parsed.metadata.name || 'skill';
      } catch (err) {
        return res.status(400).json({ error: 'Invalid SKILL.md content: ' + (err as Error).message });
      }
      const id = toSkillId(skillName);
      const existing = Object.keys(config.skills || {});
      finalId = id;
      let n = 1;
      while (existing.includes(finalId)) {
        finalId = `${id}-${n++}`;
      }
      skillPath = path.join(MANAGED_SKILLS_DIR, finalId);
      if (fs.existsSync(skillPath)) {
        return res.status(400).json({ error: `Skill already exists at ${skillPath}` });
      }
      fs.mkdirSync(skillPath, { recursive: true });
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      fs.writeFileSync(skillMdPath, contentArg.trim(), 'utf8');
    } else {
      return res.status(400).json({
        error: 'Either path (to import) or content (SKILL.md) is required',
      });
    }

    const skill: Omit<Skill, 'id'> = {
      path: skillPath,
      name: skillName,
      enabled: body.enabled !== false,
    };

    config.skills = config.skills || {};
    config.skills[finalId] = skill;
    config.skillOrder = config.skillOrder || [];
    if (!config.skillOrder.includes(finalId)) {
      config.skillOrder.push(finalId);
    }

    const skillMdPath = path.join(skillPath, 'SKILL.md');
    let contentPreview: string | undefined;
    if (fs.existsSync(skillMdPath)) {
      const full = fs.readFileSync(skillMdPath, 'utf8');
      contentPreview = full.length > 200 ? `${full.slice(0, 200)}…` : full;
    }
    saveConfig(config, {
      action: 'skill_create',
      details: { skillId: finalId, skillName, contentPreview },
    });
    res.status(201).json({ id: finalId, ...skill });
  });

  router.put('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    if (!config.skills?.[skillId]) return res.status(404).json({ error: 'Skill not found' });
    const body = (req.body || {}) as Record<string, unknown>;
    const skill = config.skills[skillId];
    const changedFields: string[] = [];

    if (body.path !== undefined) {
      return res.status(400).json({
        error: 'Path cannot be changed. Skills are stored in ~/.ai_tools_manager/skills/',
      });
    }
    if (body.enabled !== undefined) {
      skill.enabled = body.enabled as boolean;
      changedFields.push('enabled');
    }
    if (body.name !== undefined) {
      skill.name = body.name as string;
      changedFields.push('name');
    }

    saveConfig(config, {
      action: 'skill_update',
      details: { skillId, skillName: skill.name, changedFields },
    });
    res.json({ id: skillId, ...skill });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    if (!config.skills?.[skillId]) return res.status(404).json({ error: 'Skill not found' });
    const skillName = config.skills[skillId].name;
    const deleteFiles = (req.query.deleteFiles as string) === 'true';
    const skillPath = config.skills[skillId].path;

    delete config.skills[skillId];
    if (config.skillOrder) {
      config.skillOrder = config.skillOrder.filter((id) => id !== skillId);
    }

    if (deleteFiles && isPathSafe(skillPath) && fs.existsSync(skillPath)) {
      fs.rmSync(skillPath, { recursive: true });
    }

    saveConfig(config, { action: 'skill_delete', details: { skillId, skillName } });
    res.status(204).send();
  });

  router.patch('/reorder', (req: Request, res: Response) => {
    const config = getConfig();
    const order = (req.body as { order?: string[] })?.order;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of skill IDs' });
    const skills = config.skills || {};
    const validOrder = order.filter((id) => skills[id]);
    const extraIds = Object.keys(skills).filter((id) => !validOrder.includes(id));
    config.skillOrder = [...validOrder, ...extraIds];
    saveConfig(config, { action: 'skill_reorder', details: { order: config.skillOrder } });
    res.json({ order: config.skillOrder });
  });

  router.patch('/:id/enabled', (req: Request, res: Response) => {
    const config = getConfig();
    const skillId = String(req.params.id ?? '');
    if (!config.skills?.[skillId]) return res.status(404).json({ error: 'Skill not found' });
    const enabled = (req.body as { enabled?: boolean })?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    config.skills[skillId].enabled = enabled;
    saveConfig(config, { action: 'skill_enable_toggle', details: { skillId, enabled } });
    res.json({ id: skillId, enabled });
  });

  return router;
}
