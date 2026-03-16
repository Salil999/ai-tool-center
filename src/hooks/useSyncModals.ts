import { useState, useCallback, useMemo } from 'react';
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
  /** Stable sync handler that closes the modal and dispatches via confirm flow */
  syncAndClose: (target: string) => void;
  /** Stable project sync handler: closes modal, appends projectId, dispatches */
  syncProjectAndClose: (targetPrefix: string, projectId: string) => void;
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
  const { requestSync } = syncConfirm;

  const openModal = useCallback((providerId: string) => {
    setActiveModal(providerId);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleSyncRequest = useCallback(
    (target: string) => {
      requestSync(() => handleSync(target));
    },
    [handleSync, requestSync]
  );

  const syncAndClose = useCallback(
    (target: string) => {
      setActiveModal(null);
      requestSync(() => handleSync(target));
    },
    [handleSync, requestSync]
  );

  const syncProjectAndClose = useCallback(
    (targetPrefix: string, projectId: string) => {
      setActiveModal(null);
      requestSync(() => handleSync(`${targetPrefix}${projectId}`));
    },
    [handleSync, requestSync]
  );

  return useMemo(() => ({
    activeModal,
    openModal,
    closeModal,
    handleSyncRequest,
    syncAndClose,
    syncProjectAndClose,
  }), [activeModal, openModal, closeModal, handleSyncRequest, syncAndClose, syncProjectAndClose]);
}
