import { EditModal } from '@/components/mcp/EditModal';
import { ImportModal } from '@/components/mcp/ImportModal';
import { InfoModal } from '@/components/shared/InfoModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { Toast } from '@/components/shared/Toast';
import { Modal } from '@/components/shared/Modal';
import { useToast } from '@/contexts/ToastContext';
import type { TabId } from '@/App';

type SettingsTabId = 'general' | 'projects' | 'providers';

interface ModalContainerProps {
  activeTab: TabId;
  editServerId: string | null;
  importOpen: boolean;
  infoOpen: boolean;
  settingsOpen: boolean;
  settingsInitialTab?: SettingsTabId;
  onCloseEdit: () => void;
  onSave: (id: string | null, payload: Record<string, unknown>) => Promise<void>;
  onCloseImport: () => void;
  onImport: (result: { imported: number; total: number }) => void;
  onImportError: (msg: string) => void;
  onCloseInfo: () => void;
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
  importOpen,
  infoOpen,
  settingsOpen,
  settingsInitialTab = 'general',
  onCloseEdit,
  onSave,
  onCloseImport,
  onImport,
  onImportError,
  onCloseInfo,
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
            initialTab={settingsInitialTab}
          />
        </Modal>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
      )}
    </>
  );
}