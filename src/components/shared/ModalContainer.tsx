import { EditModal } from '@/components/mcp/EditModal';
import { ImportModal } from '@/components/mcp/ImportModal';
import { InfoModal } from '@/components/shared/InfoModal';
import { Toast } from '@/components/shared/Toast';
import { Modal } from '@/components/shared/Modal';
import { useToast } from '@/contexts/ToastContext';
import type { TabId } from '@/App';

interface ModalContainerProps {
  activeTab: TabId;
  editServerId: string | null;
  importOpen: boolean;
  infoOpen: boolean;
  onCloseEdit: () => void;
  onSave: (id: string | null, payload: Record<string, unknown>) => Promise<void>;
  onCloseImport: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onImportError: (msg: string) => void;
  onCloseInfo: () => void;
  loadServers: () => void;
}

export function ModalContainer({
  activeTab,
  editServerId,
  importOpen,
  infoOpen,
  onCloseEdit,
  onSave,
  onCloseImport,
  onImport,
  onImportError,
  onCloseInfo,
  loadServers,
}: ModalContainerProps) {
  const { toast, dismissToast } = useToast();

  return (
    <>
      {editServerId !== null && (
        <Modal isOpen onClose={onCloseEdit} aria-labelledby="edit-modal-title">
          <EditModal
            serverId={editServerId === 'new' ? null : editServerId}
            onClose={onCloseEdit}
            onSave={onSave}
          />
        </Modal>
      )}

      {infoOpen && (
        <Modal isOpen onClose={onCloseInfo} aria-labelledby="info-modal-title">
          <InfoModal onClose={onCloseInfo} activeTab={activeTab} />
        </Modal>
      )}

      {importOpen && (
        <Modal isOpen onClose={onCloseImport} aria-labelledby="import-modal-title">
          <ImportModal
            onClose={onCloseImport}
            onImport={(result) => {
              onImport(result);
              loadServers();
            }}
            onError={onImportError}
          />
        </Modal>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
      )}
    </>
  );
}
