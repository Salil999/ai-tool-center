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
import type { AppConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CreateAppOptions {
  configPath?: string;
  baseUrl?: string;
  port?: number;
}

export function createApp(options: CreateAppOptions = {}) {
  const configPath = getConfigPath(options.configPath);
  const baseUrl = options.baseUrl || `http://localhost:${options.port || 3847}`;
  let config = loadConfig(configPath);

  const getConfig = (): AppConfig => {
    config = loadConfig(configPath);
    return config;
  };

  const saveConfigFn = (cfg: AppConfig) => {
    config = cfg;
    saveConfig(configPath, cfg);
  };

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/servers', createServersRouter(getConfig, saveConfigFn, baseUrl));
  app.use('/api/sync', createSyncRouter(getConfig));
  app.use('/api/config', createConfigRouter(getConfig, saveConfigFn));
  app.use('/api/import', createImportRouter(getConfig, saveConfigFn));
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
