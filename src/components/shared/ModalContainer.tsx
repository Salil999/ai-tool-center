import { EditModal } from '@/components/mcp/EditModal';
import { CustomSyncModal } from '@/components/mcp/CustomSyncModal';
import { ImportModal } from '@/components/mcp/ImportModal';
import { InfoModal } from '@/components/shared/InfoModal';
import { AuditModal } from '@/components/shared/AuditModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { Toast } from '@/components/shared/Toast';

type TabId = 'mcp' | 'skills' | 'credentials';

interface ModalContainerProps {
  activeTab: TabId;
  editServerId: string | null;
  customSyncOpen: boolean;
  importOpen: boolean;
  infoOpen: boolean;
  auditOpen: boolean;
  settingsOpen: boolean;
  toast: { message: string; type: string } | null;
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
  onDismissToast: () => void;
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
  toast,
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
  onDismissToast,
  loadServers,
}: ModalContainerProps) {
  return (
    <>
      {editServerId !== null && (
        <div className="modal-overlay" onClick={onCloseEdit}>
          <div onClick={(e) => e.stopPropagation()}>
            <EditModal
              serverId={editServerId === 'new' ? null : editServerId}
              onClose={onCloseEdit}
              onSave={onSave}
            />
          </div>
        </div>
      )}

      {customSyncOpen && (
        <div className="modal-overlay" onClick={onCloseCustomSync}>
          <div onClick={(e) => e.stopPropagation()}>
            <CustomSyncModal onClose={onCloseCustomSync} onSync={onCustomSync} />
          </div>
        </div>
      )}

      {auditOpen && (
        <div className="modal-overlay" onClick={onCloseAudit}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuditModal onClose={onCloseAudit} />
          </div>
        </div>
      )}

      {infoOpen && (
        <div className="modal-overlay" onClick={onCloseInfo}>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoModal onClose={onCloseInfo} activeTab={activeTab} />
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-overlay" onClick={onCloseImport}>
          <div onClick={(e) => e.stopPropagation()}>
            <ImportModal
              onClose={onCloseImport}
              onImport={(result) => {
                onImport(result);
                loadServers();
              }}
              onError={onImportError}
            />
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-overlay" onClick={onCloseSettings}>
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsModal
              onClose={onCloseSettings}
              onReset={onSettingsReset}
              onImport={onSettingsImport}
              onError={onSettingsError}
              onSuccess={onSettingsSuccess}
            />
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={onDismissToast} />
      )}
    </>
  );
}