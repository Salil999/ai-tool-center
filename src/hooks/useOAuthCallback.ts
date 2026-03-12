import { useEffect } from 'react';

export function useOAuthCallback(showToast: (message: string, type?: string) => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') {
      const serverId = params.get('serverId');
      showToast(serverId ? `Authorization complete for ${serverId}` : 'Authorization complete');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauth === 'error') {
      const message = params.get('message') || 'Authorization failed';
      showToast(decodeURIComponent(message), 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);
}
