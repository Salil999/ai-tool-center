/**
 * Fetch tools from an MCP server using the MCP protocol.
 * Supports stdio and Streamable HTTP transports.
 * For HTTP servers without Bearer token, uses OAuth 2.1 flow when authProvider options are provided.
 */

class OAuthRequiredError extends Error {
  constructor(message = 'Authorization required. Please complete the sign-in in your browser, then try again.') {
    super(message);
    this.code = 'OAUTH_REQUIRED';
  }
}

function hasValidBearerToken(server) {
  const auth = server.headers?.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  return token.length > 0;
}

function isOAuthRelatedError(err) {
  const msg = err?.message || '';
  return (
    msg.includes('invalid_token') ||
    msg.includes('Missing or invalid access token') ||
    msg.includes('Unauthorized') ||
    msg.includes('OAuth')
  );
}

async function fetchToolsFromServer(server, options = {}) {
  const { serverId, baseUrl } = options;
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const { StreamableHTTPClientTransport, StreamableHTTPError } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

  let transport;
  if (server.url) {
    const url = server.url.startsWith('http') ? server.url : `https://${server.url}`;
    const transportOpts = {};

    if (hasValidBearerToken(server)) {
      transportOpts.requestInit = { headers: server.headers };
    } else if (serverId && baseUrl) {
      const { createOAuthProvider } = require('./oauth-provider');
      transportOpts.authProvider = createOAuthProvider(serverId, url, baseUrl);
    } else if (server.headers) {
      transportOpts.requestInit = { headers: server.headers };
    }

    transport = new StreamableHTTPClientTransport(new URL(url), transportOpts);
  } else if (server.type === 'stdio' && server.command) {
    const parsed = parseCommand(server.command);
    const args = Array.isArray(server.args) && server.args.length ? server.args : parsed.args;
    transport = new StdioClientTransport({
      command: parsed.command,
      args,
      env: server.env || {},
    });
  } else {
    throw new Error('Server must have url (HTTP) or command (stdio)');
  }

  const client = new Client(
    { name: 'ai-tools-manager', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    const result = await client.listTools();
    return result.tools || [];
  } catch (err) {
    const { UnauthorizedError } = await import('@modelcontextprotocol/sdk/client/auth.js');
    const isOAuth =
      err instanceof UnauthorizedError ||
      (err instanceof StreamableHTTPError && isOAuthRelatedError(err)) ||
      isOAuthRelatedError(err);
    if (isOAuth) {
      throw new OAuthRequiredError('Authorization required. Please complete the sign-in in your browser, then try again.');
    }
    throw err;
  } finally {
    try {
      await client.close();
    } catch (_) {}
  }
}

function parseCommand(cmd) {
  const trimmed = String(cmd || '').trim();
  if (!trimmed) return { command: '', args: [] };
  const parts = trimmed.split(/\s+/);
  return {
    command: parts[0],
    args: parts.slice(1),
  };
}

module.exports = { fetchToolsFromServer, OAuthRequiredError, parseCommand };
