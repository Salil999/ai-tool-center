import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import { getConfigBaseDir, getConfigPath, saveConfig, DEFAULT_CONFIG } from '../config/loader.js';
import { loadCreds, saveCreds, type CredentialsData } from '../credentials/store.js';
import { getManagedSkillsDir, syncSkillsFromDisk } from '../skills/sync.js';
import { isPathSafe, mergeServers } from '../providers/utils.js';
import type { AuditStore } from '../audit/store.js';
import type { AppConfig } from '../types.js';

const SETTINGS_FILENAME = 'settings.json';

type GetConfig = () => AppConfig;
type SaveConfig = (cfg: AppConfig, options?: { action: string; details?: Record<string, unknown> }) => void;

function getSettingsPath(): string {
  return path.join(getConfigBaseDir(), SETTINGS_FILENAME);
}

function getAuditPath(): string {
  return path.join(getConfigBaseDir(), 'audit.json');
}

function getCredsPath(): string {
  return path.join(getConfigBaseDir(), 'creds', 'creds.json');
}

export function createSettingsRouter(
  getConfig: GetConfig,
  saveConfigFn: SaveConfig,
  auditStore: AuditStore
) {
  const router = Router();

  /** POST /api/settings/reset - Wipe all config data */
  router.post('/reset', (_req: Request, res: Response) => {
    const baseDir = getConfigBaseDir();
    if (!isPathSafe(baseDir)) {
      return res.status(400).json({ error: 'Config path is not allowed' });
    }

    try {
      auditStore.clear();

      const configPath = getConfigPath();
      const mcpDir = path.dirname(configPath);

      const toDelete: string[] = [configPath, getAuditPath(), getCredsPath()];
      if (fs.existsSync(mcpDir)) {
        const entries = fs.readdirSync(mcpDir);
        for (const entry of entries) {
          if (entry.startsWith('oauth-') && entry.endsWith('.json')) {
            toDelete.push(path.join(mcpDir, entry));
          }
        }
      }

      const skillsDir = getManagedSkillsDir();
      if (fs.existsSync(skillsDir)) {
        const entries = fs.readdirSync(skillsDir);
        for (const entry of entries) {
          const subPath = path.join(skillsDir, entry);
          if (fs.statSync(subPath).isDirectory()) {
            fs.rmSync(subPath, { recursive: true });
          }
        }
      }

      for (const p of toDelete) {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }

      const freshConfig: AppConfig = {
        ...DEFAULT_CONFIG,
        servers: {},
        skills: {},
        skillOrder: [],
        customProviders: [],
        projectDirectories: [],
        agentRules: [],
        customRuleConfigs: [],
      };
      syncSkillsFromDisk(freshConfig);
      saveConfig(configPath, freshConfig);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** GET /api/settings/export - Export config (excludes audit) */
  router.get('/export', (_req: Request, res: Response) => {
    try {
      const config = getConfig();
      auditStore.record('config_export', config, config, {
        exportedAt: new Date().toISOString(),
      });

      const configPath = getConfigPath();
      const configDir = path.dirname(configPath);
      let configData: AppConfig;
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        configData = JSON.parse(raw) as AppConfig;
      } else {
        configData = config;
      }

      const credsPath = getCredsPath();
      let credsData: CredentialsData = {
        order: [],
        items: {},
      };
      if (fs.existsSync(credsPath)) {
        const raw = fs.readFileSync(credsPath, 'utf8');
        const parsed = JSON.parse(raw) as CredentialsData;
        credsData = {
          order: Array.isArray(parsed.order) ? parsed.order : [],
          items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
        };
      }

      const oauth: Record<string, unknown> = {};
      if (fs.existsSync(configDir)) {
        const entries = fs.readdirSync(configDir);
        for (const entry of entries) {
          if (entry.startsWith('oauth-') && entry.endsWith('.json')) {
            const oauthPath = path.join(configDir, entry);
            try {
              const raw = fs.readFileSync(oauthPath, 'utf8');
              const serverId = entry.replace(/^oauth-/, '').replace(/\.json$/, '');
              oauth[serverId] = JSON.parse(raw);
            } catch {
              // Skip invalid oauth files
            }
          }
        }
      }

      const skills: Record<string, Record<string, string>> = {};
      const skillsDir = getManagedSkillsDir();
      if (fs.existsSync(skillsDir)) {
        const entries = fs.readdirSync(skillsDir);
        for (const entry of entries) {
          const skillPath = path.join(skillsDir, entry);
          if (fs.statSync(skillPath).isDirectory()) {
            const files: Record<string, string> = {};
            const walk = (dir: string) => {
              const items = fs.readdirSync(dir, { withFileTypes: true });
              for (const item of items) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                  walk(fullPath);
                } else {
                  const relPath = path.relative(skillPath, fullPath);
                  files[relPath] = fs.readFileSync(fullPath, 'utf8');
                }
              }
            };
            walk(skillPath);
            skills[entry] = files;
          }
        }
      }

      const exportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        config: configData,
        creds: credsData,
        oauth,
        skills,
      };

      const filename = `ai-tools-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(exportPayload, null, 2));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** POST /api/settings/import - Merge imported config */
  router.post('/import', (req: Request, res: Response) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid import payload' });
    }

    try {
      const config = getConfig();
      let importedServers = 0;
      let importedSkills = 0;
      let importedCreds = 0;

      if (body.config && typeof body.config === 'object') {
        const imported = body.config as AppConfig;
        const existingServers = config.servers || {};
        const importedServersMap = imported.servers || {};
        const beforeCount = Object.keys(existingServers).length;
        config.servers = mergeServers(existingServers, importedServersMap);
        importedServers = Object.keys(config.servers).length - beforeCount;

        config.serverOrder = config.serverOrder || Object.keys(existingServers);
        const newServerIds = Object.keys(config.servers).filter((id) => !config.serverOrder!.includes(id));
        config.serverOrder = [...config.serverOrder!, ...newServerIds];

        if (Array.isArray(imported.customProviders) && imported.customProviders.length > 0) {
          const existingIds = new Set((config.customProviders || []).map((p) => p.id));
          for (const p of imported.customProviders) {
            if (!existingIds.has(p.id)) {
              config.customProviders = config.customProviders || [];
              config.customProviders.push(p);
              existingIds.add(p.id);
            }
          }
        }

        if (Array.isArray(imported.projectDirectories) && imported.projectDirectories.length > 0) {
          const existingIds = new Set((config.projectDirectories || []).map((d) => d.id));
          for (const d of imported.projectDirectories) {
            if (!existingIds.has(d.id)) {
              config.projectDirectories = config.projectDirectories || [];
              config.projectDirectories.push(d);
              existingIds.add(d.id);
            }
          }
        }

        if (Array.isArray(imported.agentRules) && imported.agentRules.length > 0) {
          const existingIds = new Set((config.agentRules || []).map((a) => a.id));
          for (const a of imported.agentRules) {
            if (!existingIds.has(a.id)) {
              config.agentRules = config.agentRules || [];
              config.agentRules.push(a);
              existingIds.add(a.id);
            }
          }
        }

        if (Array.isArray(imported.customRuleConfigs) && imported.customRuleConfigs.length > 0) {
          const existingIds = new Set((config.customRuleConfigs || []).map((c) => c.id));
          for (const c of imported.customRuleConfigs) {
            if (!existingIds.has(c.id)) {
              config.customRuleConfigs = config.customRuleConfigs || [];
              config.customRuleConfigs.push(c);
              existingIds.add(c.id);
            }
          }
        }

        if (imported.auditOptions?.maxEntries != null) {
          config.auditOptions = config.auditOptions || {};
          config.auditOptions.maxEntries = imported.auditOptions.maxEntries;
        }

        if (imported.skillOrder && Array.isArray(imported.skillOrder)) {
          const existingOrder = config.skillOrder || Object.keys(config.skills || {});
          const newIds = imported.skillOrder.filter((id: string) => !existingOrder.includes(id));
          config.skillOrder = [...existingOrder, ...newIds];
        }

        if (imported.skills && typeof imported.skills === 'object') {
          const existingSkills = config.skills || {};
          for (const [id, skill] of Object.entries(imported.skills) as [string, Omit<import('../types.js').Skill, 'id'>][]) {
            if (!existingSkills[id]) {
              config.skills = config.skills || {};
              config.skills[id] = skill;
            }
          }
        }
      }

      if (body.creds && typeof body.creds === 'object') {
        const creds = loadCreds();
        const imported = body.creds as CredentialsData;
        const importedItems = imported.items || {};
        let added = 0;
        for (const [id, item] of Object.entries(importedItems)) {
          if (!creds.items[id]) {
            creds.items[id] = item;
            if (!creds.order.includes(id)) creds.order.push(id);
            added++;
          }
        }
        importedCreds = added;
        saveCreds(creds);
      }

      if (body.oauth && typeof body.oauth === 'object') {
        const configPath = getConfigPath();
        const mcpDir = path.dirname(configPath);
        if (!fs.existsSync(mcpDir)) {
          fs.mkdirSync(mcpDir, { recursive: true });
        }
        const serverIds = new Set(Object.keys(config.servers || {}));
        for (const [serverId, tokenData] of Object.entries(body.oauth)) {
          if (serverIds.has(serverId) && tokenData && typeof tokenData === 'object') {
            const safeId = serverId.replace(/[^a-z0-9-]/gi, '_');
            const oauthPath = path.join(mcpDir, `oauth-${safeId}.json`);
            fs.writeFileSync(oauthPath, JSON.stringify(tokenData, null, 2), 'utf8');
          }
        }
      }

      if (body.skills && typeof body.skills === 'object') {
        const skillsDir = getManagedSkillsDir();
        if (!isPathSafe(skillsDir)) {
          throw new Error('Skills path is not allowed');
        }
        if (!fs.existsSync(skillsDir)) {
          fs.mkdirSync(skillsDir, { recursive: true });
        }
        for (const [skillId, files] of Object.entries(body.skills) as [string, Record<string, string>][]) {
          if (files && typeof files === 'object') {
            const safeId = skillId.replace(/[^a-z0-9-_]/gi, '_');
            const destPath = path.join(skillsDir, safeId);
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true });
              for (const [filePath, content] of Object.entries(files)) {
                const fullPath = path.join(destPath, filePath);
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
                if (isPathSafe(fullPath)) {
                  fs.writeFileSync(fullPath, content, 'utf8');
                }
              }
              importedSkills++;
            }
          }
        }
        syncSkillsFromDisk(config);
      }

      saveConfigFn(config, {
        action: 'config_import',
        details: { importedServers, importedSkills, importedCreds },
      });

      res.json({
        success: true,
        imported: { servers: importedServers, skills: importedSkills, creds: importedCreds },
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** GET /api/settings/theme */
  router.get('/theme', (_req: Request, res: Response) => {
    try {
      const settingsPath = getSettingsPath();
      let theme: 'dark' | 'light' | 'system' = 'dark';
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        const parsed = JSON.parse(raw) as { theme?: string };
        if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
          theme = parsed.theme;
        }
      }
      res.json({ theme });
    } catch {
      res.json({ theme: 'dark' });
    }
  });

  /** PUT /api/settings/theme */
  router.put('/theme', (req: Request, res: Response) => {
    const body = req.body;
    const theme = body?.theme;
    if (theme !== 'dark' && theme !== 'light' && theme !== 'system') {
      return res.status(400).json({ error: 'theme must be dark, light, or system' });
    }

    try {
      const settingsPath = getSettingsPath();
      const baseDir = path.dirname(settingsPath);
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      let data: Record<string, unknown> = {};
      if (fs.existsSync(settingsPath)) {
        data = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
      }
      data.theme = theme;
      fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
      res.json({ theme });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
