const { Router } = require('express');
const { fetchToolsFromServer, OAuthRequiredError } = require('../mcp/tools');

function createServersRouter(getConfig, saveConfig, baseUrl = 'http://localhost:3847') {
  const router = Router();

  router.get('/', (req, res) => {
    const config = getConfig();
    const servers = config.servers || {};
    const list = Object.entries(servers).map(([id, s]) => ({ id, ...s }));
    res.json(list);
  });

  // More specific routes must come before /:id
  router.get('/:id/tools', async (req, res) => {
    const config = getConfig();
    const serverId = req.params.id;
    const server = config.servers?.[serverId];
    if (!server) return res.status(404).json({ error: 'Server not found' });
    try {
      const tools = await fetchToolsFromServer(server, { serverId, baseUrl });
      res.json({ tools });
    } catch (err) {
      if (err instanceof OAuthRequiredError || (err && err.code === 'OAUTH_REQUIRED')) {
        return res.status(401).json({ error: 'OAUTH_REQUIRED', message: err.message || 'Authorization required.' });
      }
      res.status(500).json({ error: err.message || 'Failed to fetch tools' });
    }
  });

  router.get('/:id', (req, res) => {
    const config = getConfig();
    const server = config.servers?.[req.params.id];
    if (!server) return res.status(404).json({ error: 'Server not found' });
    res.json({ id: req.params.id, ...server });
  });

  router.post('/', (req, res) => {
    const config = getConfig();
    const body = req.body || {};
    const id = (body.id || body.name || 'server').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'server';
    const existing = Object.keys(config.servers || {});
    let finalId = id;
    let n = 1;
    while (existing.includes(finalId)) {
      finalId = `${id}-${n++}`;
    }
    const server = {
      name: body.name || finalId,
      enabled: body.enabled !== false,
      type: body.type || 'stdio',
      command: body.command,
      args: Array.isArray(body.args) ? body.args : [],
      env: typeof body.env === 'object' ? body.env : {},
      url: body.url,
      headers: body.headers && typeof body.headers === 'object' ? body.headers : undefined,
    };
    config.servers = config.servers || {};
    config.servers[finalId] = server;
    saveConfig(config);
    res.status(201).json({ id: finalId, ...server });
  });

  router.put('/:id', (req, res) => {
    const config = getConfig();
    if (!config.servers?.[req.params.id]) return res.status(404).json({ error: 'Server not found' });
    const body = req.body || {};
    const server = config.servers[req.params.id];
    if (body.name !== undefined) server.name = body.name;
    if (body.enabled !== undefined) server.enabled = body.enabled;
    if (body.type !== undefined) server.type = body.type;
    if (body.command !== undefined) server.command = body.command;
    if (body.args !== undefined) server.args = Array.isArray(body.args) ? body.args : [];
    if (body.env !== undefined) server.env = typeof body.env === 'object' ? body.env : {};
    if (body.url !== undefined) server.url = body.url;
    if (body.headers !== undefined) server.headers = body.headers && typeof body.headers === 'object' ? body.headers : undefined;
    saveConfig(config);
    res.json({ id: req.params.id, ...server });
  });

  router.delete('/:id', (req, res) => {
    const config = getConfig();
    if (!config.servers?.[req.params.id]) return res.status(404).json({ error: 'Server not found' });
    delete config.servers[req.params.id];
    saveConfig(config);
    res.status(204).send();
  });

  router.patch('/:id/enabled', (req, res) => {
    const config = getConfig();
    if (!config.servers?.[req.params.id]) return res.status(404).json({ error: 'Server not found' });
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    config.servers[req.params.id].enabled = enabled;
    saveConfig(config);
    res.json({ id: req.params.id, enabled });
  });

  return router;
}

module.exports = { createServersRouter };
