import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

export function useOAuthCallback() {
  const { showToast } = useToast();

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
