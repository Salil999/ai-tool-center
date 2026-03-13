import { useState } from 'react';
import { Modal } from './Modal';

interface SyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function SyncConfirmModal({ isOpen, onClose, onConfirm }: SyncConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} aria-labelledby="sync-confirm-modal-title">
      <div className="modal edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="sync-confirm-modal-title">Confirm Sync</h2>
          <button type="button" className="btn btn-sm" onClick={handleCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="sync-confirm-warning">
            Whatever is displayed on this page is the source of truth. It&apos;s strongly recommended to import before
            syncing.
          </p>
          <p>Are you sure you want to sync?</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={handleCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
