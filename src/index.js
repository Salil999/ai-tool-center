const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { loadConfig, saveConfig, getConfigPath } = require('./config/loader');
const { createServersRouter } = require('./api/servers');
const { createSyncRouter } = require('./api/sync');
const { createConfigRouter } = require('./api/config');
const { createImportRouter } = require('./api/import');
const { createOAuthRouter } = require('./api/oauth');

function createApp(options = {}) {
  const configPath = getConfigPath(options.configPath);
  const baseUrl = options.baseUrl || `http://localhost:${options.port || 3847}`;
  let config = loadConfig(configPath);

  const getConfig = () => {
    config = loadConfig(configPath);
    return config;
  };

  const saveConfigFn = (cfg) => {
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

module.exports = { createApp };
