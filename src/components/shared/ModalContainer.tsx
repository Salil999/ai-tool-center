import { EditModal } from '@/components/mcp/EditModal';
import { CustomSyncModal } from '@/components/mcp/CustomSyncModal';
import { ImportModal } from '@/components/mcp/ImportModal';
import { InfoModal } from '@/components/shared/InfoModal';
import { AuditModal } from '@/components/shared/AuditModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { Toast } from '@/components/shared/Toast';
import { Modal } from '@/components/shared/Modal';
import { useToast } from '@/contexts/ToastContext';

type TabId = 'mcp' | 'skills' | 'rules' | 'agents' | 'credentials';

interface ModalContainerProps {
  activeTab: TabId;
  editServerId: string | null;
  customSyncOpen: boolean;
  importOpen: boolean;
  infoOpen: boolean;
  auditOpen: boolean;
  settingsOpen: boolean;
  onCloseEdit: () => void;
  onSave: (id: string | null, payload: Record<string, unknown>) => Promise<void>;
  onCustomSync: (path: string, configKey: string) => Promise<void>;
  onCloseCustomSync: () => void;
  onCloseImport: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onImportError: (msg: string) => void;
  onCloseInfo: () => void;
  onCloseAudit: () => void;
  onCloseSettings: () => void;
  onSettingsReset: () => void;
  onSettingsImport: () => void;
  onSettingsError: (msg: string) => void;
  onSettingsSuccess: (msg: string) => void;
  loadServers: () => void;
}

export function ModalContainer({
  activeTab,
  editServerId,
  customSyncOpen,
  importOpen,
  infoOpen,
  auditOpen,
  settingsOpen,
  onCloseEdit,
  onSave,
  onCustomSync,
  onCloseCustomSync,
  onCloseImport,
  onImport,
  onImportError,
  onCloseInfo,
  onCloseAudit,
  onCloseSettings,
  onSettingsReset,
  onSettingsImport,
  onSettingsError,
  onSettingsSuccess,
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

      {customSyncOpen && (
        <Modal isOpen onClose={onCloseCustomSync} aria-labelledby="custom-sync-modal-title">
          <CustomSyncModal onClose={onCloseCustomSync} onSync={onCustomSync} />
        </Modal>
      )}

      {auditOpen && (
        <Modal isOpen onClose={onCloseAudit} aria-labelledby="audit-modal-title">
          <AuditModal onClose={onCloseAudit} />
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

      {settingsOpen && (
        <Modal isOpen onClose={onCloseSettings} aria-labelledby="settings-modal-title">
          <SettingsModal
              onClose={onCloseSettings}
              onReset={onSettingsReset}
              onImport={onSettingsImport}
            onError={onSettingsError}
            onSuccess={onSettingsSuccess}
          />
        </Modal>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
      )}
    </>
  );
}