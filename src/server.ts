import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig, getConfigPath } from './config/loader.js';
import { createServersRouter } from './api/servers.js';
import { createSyncRouter } from './api/sync.js';
import { createConfigRouter } from './api/config.js';
import { createImportRouter } from './api/import.js';
import { createOAuthRouter } from './api/oauth.js';
import { createAuditRouter } from './api/audit.js';
import { createSkillsRouter } from './api/skills.js';
import { createSkillsSyncRouter } from './api/skills-sync.js';
import { createSkillsImportRouter } from './api/skills-import.js';
import { createSkillsRegistryRouter } from './api/skills-registry.js';
import { createProjectDirectoriesRouter } from './api/project-directories.js';
import { createCredentialsRouter } from './api/credentials.js';
import { createSettingsRouter } from './api/settings.js';
import { AuditStore } from './audit/store.js';
import type { AppConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface SaveConfigOptions {
  action: string;
  details?: Record<string, unknown>;
}

export type SaveConfig = (cfg: AppConfig, options?: SaveConfigOptions) => void;

export interface CreateAppOptions {
  configPath?: string;
  baseUrl?: string;
  port?: number;
  /** Directory for audit log file. Defaults to ~/.ai_tools_manager */
  auditDir?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const configPath = getConfigPath(options.configPath);
  const baseUrl = options.baseUrl || `http://localhost:${options.port || 3847}`;
  let config = loadConfig(configPath);

  const auditStore = new AuditStore(
    config.auditOptions?.maxEntries ?? 100,
    options.auditDir
  );

  const getConfig = (): AppConfig => {
    config = loadConfig(configPath);
    return config;
  };

  const saveConfigFn: SaveConfig = (cfg: AppConfig, opts?: SaveConfigOptions) => {
    const configBefore = getConfig();
    config = cfg;
    saveConfig(configPath, cfg);
    auditStore.record(
      opts?.action ?? 'config_change',
      configBefore,
      cfg,
      opts?.details
    );
  };

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/servers', createServersRouter(getConfig, saveConfigFn, baseUrl));
  app.use('/api/sync', createSyncRouter(getConfig, auditStore));
  app.use('/api/skills/sync', createSkillsSyncRouter(getConfig, auditStore));
  app.use('/api/skills/import', createSkillsImportRouter(getConfig, saveConfigFn));
  app.use('/api/skills/registry', createSkillsRegistryRouter(getConfig, saveConfigFn));
  app.use('/api/skills', createSkillsRouter(getConfig, saveConfigFn, auditStore));
  app.use('/api/project-directories', createProjectDirectoriesRouter(getConfig, saveConfigFn));
  app.use('/api/credentials', createCredentialsRouter(getConfig, auditStore));
  app.use('/api/config', createConfigRouter(getConfig, saveConfigFn));
  app.use('/api/import', createImportRouter(getConfig, saveConfigFn));
  app.use('/api/audit', createAuditRouter(auditStore, getConfig, saveConfigFn));
  app.use('/api/settings', createSettingsRouter(getConfig, saveConfigFn, auditStore));
  app.use('/oauth', createOAuthRouter(baseUrl));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const distDir = path.join(__dirname, '..', 'dist');
  const publicDir = path.join(__dirname, '..', 'public');
  const cwdDist = path.join(process.cwd(), 'dist');
  const cwdPublic = path.join(process.cwd(), 'public');
  const staticDir = fs.existsSync(distDir)
    ? distDir
    : fs.existsSync(cwdDist)
      ? cwdDist
      : fs.existsSync(publicDir)
        ? publicDir
        : cwdPublic;
  const indexPath = path.join(staticDir, 'index.html');

  app.use(express.static(staticDir));
  app.get('/', (req, res) => {
    res.sendFile(indexPath);
  });

  return app;
}
