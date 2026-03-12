/**
 * OAuthClientProvider implementation for MCP servers.
 * Handles OAuth 2.1 with PKCE, dynamic client registration, and token persistence.
 */

const openModule = require('open');
const open = openModule?.default ?? openModule;
const {
  getServerOAuthState,
  saveServerOAuthState,
  setPendingAuth,
  generateState,
} = require('./oauth-store');

function createOAuthProvider(serverId, serverUrl, baseUrl) {
  const redirectUrl = `${baseUrl}/oauth/callback`;
  const redirectUrlObj = new URL(redirectUrl);

  return {
    get redirectUrl() {
      return redirectUrlObj;
    },

    get clientMetadata() {
      return {
        redirect_uris: [redirectUrl],
        client_name: 'ai-tools-manager',
        scope: 'openid',
      };
    },

    async state() {
      const state = generateState(serverId);
      setPendingAuth(state, { serverId, serverUrl });
      return state;
    },

    clientInformation() {
      const stored = getServerOAuthState(serverId);
      return stored?.clientInformation ?? undefined;
    },

    saveClientInformation(clientInformation) {
      const stored = getServerOAuthState(serverId) || {};
      stored.clientInformation = clientInformation;
      saveServerOAuthState(serverId, stored);
    },

    tokens() {
      const stored = getServerOAuthState(serverId);
      return stored?.tokens ?? undefined;
    },

    saveTokens(tokens) {
      const stored = getServerOAuthState(serverId) || {};
      stored.tokens = tokens;
      saveServerOAuthState(serverId, stored);
    },

    redirectToAuthorization(authorizationUrl) {
      open(authorizationUrl.toString()).catch(() => {
        // Fallback: log URL for manual copy if open fails
        console.warn('Could not open browser. Please visit:', authorizationUrl.toString());
      });
    },

    saveCodeVerifier(codeVerifier) {
      const stored = getServerOAuthState(serverId) || {};
      stored.codeVerifier = codeVerifier;
      saveServerOAuthState(serverId, stored);
    },

    codeVerifier() {
      const stored = getServerOAuthState(serverId);
      return stored?.codeVerifier ?? '';
    },

    discoveryState() {
      const stored = getServerOAuthState(serverId);
      return stored?.discoveryState ?? undefined;
    },

    saveDiscoveryState(discoveryState) {
      const stored = getServerOAuthState(serverId) || {};
      stored.discoveryState = discoveryState;
      saveServerOAuthState(serverId, stored);
    },

    invalidateCredentials(scope) {
      const stored = getServerOAuthState(serverId) || {};
      if (scope === 'all') {
        saveServerOAuthState(serverId, {});
      } else if (scope === 'tokens') {
        delete stored.tokens;
        saveServerOAuthState(serverId, stored);
      } else if (scope === 'verifier') {
        delete stored.codeVerifier;
        saveServerOAuthState(serverId, stored);
      } else if (scope === 'client') {
        delete stored.clientInformation;
        saveServerOAuthState(serverId, stored);
      } else if (scope === 'discovery') {
        delete stored.discoveryState;
        saveServerOAuthState(serverId, stored);
      }
    },
  };
}

module.exports = { createOAuthProvider };
