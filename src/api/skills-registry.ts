import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from '../router.js';
import {
  searchSkillhubRegistry,
  fetchSkillContentFromRepoUrl,
  type SkillhubSearchResponse,
} from '../skills/registry.js';
import { parseSkillContent } from '../skills/parse.js';
import { isDuplicateSkill, getManagedSkillsDir } from '../skills/sync.js';
import type { AppConfig, Skill } from '../types.js';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

function toSkillId(name: string): string {
  return (name || 'skill').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'skill';
}

export function createSkillsRegistryRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/search', async (req: Request, res: Response) => {
    const query = String(req.query.q ?? '').trim();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    try {
      const result = await searchSkillhubRegistry(query, limit);
      res.json(result as SkillhubSearchResponse);
    } catch (err) {
      res.status(502).json({
        error: 'Skillhub search failed',
        details: (err as Error).message,
      });
    }
  });

  router.post('/install', async (req: Request, res: Response) => {
    const config = getConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const slug = body.slug as string | undefined;
    const repoUrl = body.repo_url as string | undefined;

    if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
      return res.status(400).json({ error: 'repo_url is required' });
    }

    let content: string;
    try {
      content = await fetchSkillContentFromRepoUrl(repoUrl.trim());
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: (err as Error).message,
        repo_url: repoUrl,
      });
    }

    let parsed: { metadata: { name?: string } };
    try {
      parsed = parseSkillContent(content.trim());
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid SKILL.md content: ' + (err as Error).message,
      });
    }

    const skillName = parsed.metadata.name || slug || 'skill';
    if (isDuplicateSkill(skillName, config.skills || {})) {
      return res.status(400).json({ error: `Skill "${skillName}" already exists` });
    }

    const id = toSkillId(skillName);
    const existing = Object.keys(config.skills || {});
    let finalId = id;
    let n = 1;
    while (existing.includes(finalId)) {
      finalId = `${id}-${n++}`;
    }

    const skillPath = path.join(getManagedSkillsDir(), finalId);
    if (fs.existsSync(skillPath)) {
      return res.status(400).json({ error: `Skill already exists at ${skillPath}` });
    }

    fs.mkdirSync(skillPath, { recursive: true });
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    fs.writeFileSync(skillMdPath, content.trim(), 'utf8');

    const skill: Omit<Skill, 'id'> = {
      path: skillPath,
      name: skillName,
      enabled: true,
    };

    config.skills = config.skills || {};
    config.skills[finalId] = skill;
    config.skillOrder = config.skillOrder || [];
    if (!config.skillOrder.includes(finalId)) {
      config.skillOrder.push(finalId);
    }

    const contentPreview =
      content.length > 200 ? `${content.slice(0, 200)}…` : content;
    saveConfig(config, {
      action: 'skill_create',
      details: {
        skillId: finalId,
        skillName,
        contentPreview,
        source: 'registry',
        repo_url: repoUrl,
      },
    });

    res.status(201).json({ id: finalId, ...skill });
  });

  return router;
}
