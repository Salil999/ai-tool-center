/**
 * Test helpers for creating Express app with in-memory config.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import { createServersRouter } from '../api/servers.js';
import { createSyncRouter } from '../api/sync.js';
import { createConfigRouter } from '../api/config.js';
import { createImportRouter } from '../api/import.js';
import { AuditStore } from '../audit/store.js';
import type { AppConfig } from '../types.js';

export interface CreateTestAppOptions {
  config?: AppConfig;
  baseUrl?: string;
}

export function createTestApp(options: CreateTestAppOptions = {}) {
  let config: AppConfig = options.config || {
    servers: {},
    customProviders: [],
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-app-'));
  const auditStore = new AuditStore(100, tmpDir);

  const getConfig = (): AppConfig => ({ ...config });
  const saveConfig = (cfg: AppConfig) => {
    config = cfg;
  };
  const baseUrl = options.baseUrl || 'http://localhost:3847';

  const app = express();
  app.use(express.json());

  app.use('/api/servers', createServersRouter(getConfig, saveConfig, baseUrl));
  app.use('/api/sync', createSyncRouter(getConfig, auditStore));
  app.use('/api/config', createConfigRouter(getConfig, saveConfig));
  app.use('/api/import', createImportRouter(getConfig, saveConfig));

  return app;
}
