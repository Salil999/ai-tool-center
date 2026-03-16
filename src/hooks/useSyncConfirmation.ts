import { useState, useCallback } from 'react';

/**
 * Encapsulates the sync confirmation workflow: request -> confirm -> execute.
 * Eliminates the duplicated syncConfirmOpen + pendingSyncAction pattern
 * across App.tsx, SkillsTab, and RulesTab.
 */
export type SyncConfirmation = ReturnType<typeof useSyncConfirmation>;

export function useSyncConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => Promise<void>>(
    () => async () => {}
  );

  const requestSync = useCallback((action: () => Promise<void>) => {
    setPendingAction(() => action);
    setIsOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    await pendingAction();
  }, [pendingAction]);

  const cancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    requestSync,
    confirm,
    cancel,
  };
}
