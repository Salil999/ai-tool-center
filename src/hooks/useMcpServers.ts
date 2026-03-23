import { useState, useEffect, useCallback } from 'react';
import {
  getServers,
  createServer,
  updateServer,
  deleteServer,
  reorderServers,
  syncTo,
} from '../api-client';
import { useToast } from '@/contexts/ToastContext';
import type { Server } from '../types';

export function useMcpServers() {
  const { showToast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);

  const loadServers = useCallback(async () => {
    const list = await getServers();
    setServers(list as Server[]);
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleSave = useCallback(
    async (id: string | null, payload: Record<string, unknown>) => {
      if (id) {
        await updateServer(id, payload);
        showToast('Server updated');
      } else {
        await createServer(payload);
        showToast('Server added');
      }
      await loadServers();
    },
    [loadServers, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteServer(id);
      showToast('Server deleted');
      await loadServers();
    },
    [loadServers, showToast]
  );

  const handleReorder = useCallback(
    async (order: string[]) => {
      await reorderServers(order);
      showToast('Order updated');
      await loadServers();
    },
    [loadServers, showToast]
  );

  const handleSync = useCallback(
    async (target: string) => {
      const result = await syncTo(target);
      showToast(`Synced to ${target} at ${result.path}`);
    },
    [showToast]
  );

  return {
    servers,
    loadServers,
    handleSave,
    handleDelete,
    handleReorder,
    handleSync,
  };
}
