const { Router } = require('express');

function createConfigRouter(getConfig, saveConfig) {
  const router = Router();

  router.get('/', (req, res) => {
    const config = getConfig();
    res.json({
      customProviders: config.customProviders || [],
    });
  });

  router.put('/customProviders', (req, res) => {
    const config = getConfig();
    const providers = req.body;
    if (!Array.isArray(providers)) return res.status(400).json({ error: 'customProviders must be array' });
    config.customProviders = providers;
    saveConfig(config);
    res.json(config.customProviders);
  });

  router.post('/customProviders', (req, res) => {
    const config = getConfig();
    config.customProviders = config.customProviders || [];
    const { id, name, path: p, configKey } = req.body || {};
    if (!name || !p) return res.status(400).json({ error: 'name and path are required' });
    const provider = {
      id: id || `custom-${Date.now()}`,
      name,
      path: p,
      configKey: configKey || 'mcpServers',
    };
    config.customProviders.push(provider);
    saveConfig(config);
    res.status(201).json(provider);
  });

  return router;
}

module.exports = { createConfigRouter };
