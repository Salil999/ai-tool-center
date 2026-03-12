/**
 * OAuth callback route for MCP server authentication.
 * Handles the redirect from the OAuth provider (e.g. Cloudflare) after user authorization.
 */

const { Router } = require('express');
const { getPendingAuth } = require('../mcp/oauth-store');
const { createOAuthProvider } = require('../mcp/oauth-provider');

function createOAuthRouter(baseUrl) {
  const router = Router();
  const frontendUrl = (process.env.MCP_MANAGER_FRONTEND_URL || baseUrl).replace(/\/$/, '');

  router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const message = error_description || error || 'Authorization failed';
      return res.redirect(`${frontendUrl}/?oauth=error&message=${encodeURIComponent(message)}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?oauth=error&message=${encodeURIComponent('Missing code or state')}`);
    }

    const pending = getPendingAuth(state);
    if (!pending) {
      return res.redirect(`${frontendUrl}/?oauth=error&message=${encodeURIComponent('Invalid or expired state. Please try again.')}`);
    }

    const { serverId, serverUrl } = pending;
    const provider = createOAuthProvider(serverId, serverUrl, baseUrl);

    try {
      const { auth } = await import('@modelcontextprotocol/sdk/client/auth.js');
      const result = await auth(provider, {
        serverUrl: serverUrl.startsWith('http') ? serverUrl : `https://${serverUrl}`,
        authorizationCode: code,
        fetchFn: fetch,
      });

      if (result === 'AUTHORIZED') {
        return res.redirect(`${frontendUrl}/?oauth=success&serverId=${encodeURIComponent(serverId)}`);
      }
    } catch (err) {
      const message = err.message || 'Token exchange failed';
      return res.redirect(`${frontendUrl}/?oauth=error&message=${encodeURIComponent(message)}`);
    }

    return res.redirect(`${frontendUrl}/?oauth=error&message=${encodeURIComponent('Authorization incomplete')}`);
  });

  return router;
}

module.exports = { createOAuthRouter };
