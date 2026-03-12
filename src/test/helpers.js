/**
 * Test helpers for creating Express app with in-memory config.
 */
const express = require('express');
const { createServersRouter } = require('../api/servers');
const { createSyncRouter } = require('../api/sync');
const { createConfigRouter } = require('../api/config');
const { createImportRouter } = require('../api/import');

function createTestApp(options = {}) {
  let config = options.config || {
    servers: {},
    customProviders: [],
  };

  const getConfig = () => ({ ...config });
  const saveConfig = (cfg) => {
    config = cfg;
  };
  const baseUrl = options.baseUrl || 'http://localhost:3847';

  const app = express();
  app.use(express.json());

  app.use('/api/servers', createServersRouter(getConfig, saveConfig, baseUrl));
  app.use('/api/sync', createSyncRouter(getConfig));
  app.use('/api/config', createConfigRouter(getConfig, saveConfig));
  app.use('/api/import', createImportRouter(getConfig, saveConfig));

  return app;
}

module.exports = { createTestApp };
