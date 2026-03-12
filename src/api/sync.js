const { Router } = require('express');
const { PROVIDERS, exportToProvider, exportToCustom } = require('../providers');
const { isPathSafe, resolvePath } = require('../providers/utils');

function createSyncRouter(getConfig) {
  const router = Router();

  const BUILTIN_TARGETS = PROVIDERS.filter((p) => p.id !== 'claude_desktop').map((p) => ({
    id: p.id,
    name: p.name,
    path: p.getPath(),
  }));

  router.post('/custom', (req, res) => {
    const config = getConfig();
    const servers = config.servers || {};
    const { path: customPath, configKey = 'mcpServers' } = req.body || {};
    if (!customPath) return res.status(400).json({ error: 'path is required' });
    if (!isPathSafe(resolvePath(customPath))) return res.status(400).json({ error: 'Path is not allowed' });
    try {
      const result = exportToCustom(servers, customPath, configKey);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/targets', (req, res) => {
    const config = getConfig();
    const custom = (config.customProviders || []).map((p) => ({
      id: `custom-${p.id}`,
      name: p.name,
      path: p.path,
      configKey: p.configKey,
    }));
    res.json({ builtin: BUILTIN_TARGETS, custom });
  });

  router.post('/:target', (req, res) => {
    const config = getConfig();
    const servers = config.servers || {};
    const target = req.params.target;

    try {
      let result;
      if (target.startsWith('custom-')) {
        const providerId = target.slice(7);
        const provider = (config.customProviders || []).find((p) => p.id === providerId);
        if (!provider) return res.status(404).json({ error: 'Custom provider not found' });
        result = exportToCustom(servers, provider.path, provider.configKey);
      } else {
        result = exportToProvider(target, servers);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createSyncRouter };
