const { Router } = require('express');
const {
  discoverSources,
  importFromProvider,
  importFromCustom,
  mergeServers,
} = require('../providers');

function createImportRouter(getConfig, saveConfigFn) {
  const router = Router();

  router.post('/custom', (req, res) => {
    const config = getConfig();
    const { path: filePath, configKey = 'mcpServers' } = req.body || {};

    if (!filePath) return res.status(400).json({ error: 'path is required' });

    try {
      const imported = importFromCustom(filePath, configKey);
      const existing = config.servers || {};
      const merged = mergeServers(existing, imported);
      const added = Object.keys(merged).length - Object.keys(existing).length;
      config.servers = merged;
      saveConfigFn(config);
      res.json({
        success: true,
        imported: added,
        total: Object.keys(merged).length,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/sources', (req, res) => {
    try {
      const sources = discoverSources();
      res.json(sources);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:source', (req, res) => {
    const config = getConfig();
    const sourceId = req.params.source;

    try {
      const imported = importFromProvider(sourceId);
      const existing = config.servers || {};
      const merged = mergeServers(existing, imported);
      const added = Object.keys(merged).length - Object.keys(existing).length;
      config.servers = merged;
      saveConfigFn(config);
      res.json({
        success: true,
        imported: added,
        total: Object.keys(merged).length,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createImportRouter };
