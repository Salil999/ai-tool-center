import { useState, useCallback } from 'react';
import type { SyncConfirmation } from './useSyncConfirmation';

export interface SyncModals {
  /** Currently open provider modal id, or null */
  activeModal: string | null;
  /** Open a provider-specific sync modal */
  openModal: (providerId: string) => void;
  /** Close the currently open modal */
  closeModal: () => void;
  /** Handle a generic (non-provider-specific) sync via the confirm flow */
  handleSyncRequest: (target: string) => void;
  /** Build a sync handler that resolves the sync target string from provider + scope */
  createSyncHandler: (
    target: string
  ) => () => void;
  /** Build a project sync handler that includes the project ID */
  createProjectSyncHandler: (
    targetPrefix: string
  ) => (projectId: string) => void;
}

/**
 * Manages provider-specific sync modal state (Cursor, Claude, OpenCode, etc.).
 * Keeps App.tsx clean by encapsulating all modal open/close + sync dispatch logic.
 */
export function useSyncModals(
  handleSync: (target: string) => Promise<void>,
  syncConfirm: SyncConfirmation
): SyncModals {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = useCallback((providerId: string) => {
    setActiveModal(providerId);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleSyncRequest = useCallback(
    (target: string) => {
      syncConfirm.requestSync(() => handleSync(target));
    },
    [handleSync, syncConfirm]
  );

  const createSyncHandler = useCallback(
    (target: string) => () => {
      setActiveModal(null);
      syncConfirm.requestSync(() => handleSync(target));
    },
    [handleSync, syncConfirm]
  );

  const createProjectSyncHandler = useCallback(
    (targetPrefix: string) => (projectId: string) => {
      setActiveModal(null);
      syncConfirm.requestSync(() => handleSync(`${targetPrefix}${projectId}`));
    },
    [handleSync, syncConfirm]
  );

  return {
    activeModal,
    openModal,
    closeModal,
    handleSyncRequest,
    createSyncHandler,
    createProjectSyncHandler,
  };
}
