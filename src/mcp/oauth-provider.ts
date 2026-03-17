/**
 * OAuthClientProvider implementation for MCP servers.
 * Handles OAuth 2.1 with PKCE, dynamic client registration, and token persistence.
 */

import openModule from 'open';
const open = (openModule as { default?: typeof openModule }).default ?? openModule;
import {
  getServerOAuthState,
  saveServerOAuthState,
  setPendingAuth,
  generateState,
} from './oauth-store.js';

export function createOAuthProvider(serverId: string, serverUrl: string, baseUrl: string) {
  const redirectUrl = `${baseUrl}/oauth/callback`;
  const redirectUrlObj = new URL(redirectUrl);

  return {
    get redirectUrl() {
      return redirectUrlObj;
    },

    get clientMetadata() {
      return {
        redirect_uris: [redirectUrl],
        client_name: 'ai-tool-center',
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
      return stored?.clientInformation as Record<string, unknown> | undefined;
    },

    saveClientInformation(clientInformation: Record<string, unknown>) {
      const stored = getServerOAuthState(serverId) || {};
      stored.clientInformation = clientInformation;
      saveServerOAuthState(serverId, stored);
    },

    tokens() {
      const stored = getServerOAuthState(serverId);
      return stored?.tokens as Record<string, unknown> | undefined;
    },

    saveTokens(tokens: Record<string, unknown>) {
      const stored = getServerOAuthState(serverId) || {};
      stored.tokens = tokens;
      saveServerOAuthState(serverId, stored);
    },

    redirectToAuthorization(authorizationUrl: URL) {
      open(authorizationUrl.toString()).catch(() => {
        console.warn('Could not open browser. Please visit:', authorizationUrl.toString());
      });
    },

    saveCodeVerifier(codeVerifier: string) {
      const stored = getServerOAuthState(serverId) || {};
      stored.codeVerifier = codeVerifier;
      saveServerOAuthState(serverId, stored);
    },

    codeVerifier() {
      const stored = getServerOAuthState(serverId);
      return (stored?.codeVerifier as string) ?? '';
    },

    discoveryState() {
      const stored = getServerOAuthState(serverId);
      return stored?.discoveryState as Record<string, unknown> | undefined;
    },

    saveDiscoveryState(discoveryState: Record<string, unknown>) {
      const stored = getServerOAuthState(serverId) || {};
      stored.discoveryState = discoveryState;
      saveServerOAuthState(serverId, stored);
    },

    invalidateCredentials(scope: string) {
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
