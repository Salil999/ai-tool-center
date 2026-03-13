import { useState } from 'react';
import { ImportRuleModal } from './ImportRuleModal';
import { ProviderRulesSection } from './ProviderRulesSection';
import { CustomRulesSection } from './CustomRulesSection';
import { syncRulesTo } from '../../api-client';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/shared/Modal';

export function RulesTab() {
  const { showToast } = useToast();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [rulesRefreshTrigger, setRulesRefreshTrigger] = useState(0);

  const handleSyncToProvider = async (target: string) => {
    try {
      const result = await syncRulesTo(target);
      const count = result.syncedCount;
      showToast(
        count !== undefined
          ? `Synced ${count} rule(s) to ${target}`
          : `Rules synced to ${target}`
      );
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <>
      <div className="servers-section-header">
        <h2>Rules</h2>
        <div className="header-actions">
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
        </div>
      </div>

      <section className="rules-section rules-section-providers">
        <ProviderRulesSection
          providerId="cursor"
          providerName="Cursor Rules"
          onSync={handleSyncToProvider}
          refreshTrigger={rulesRefreshTrigger}
        />
        <ProviderRulesSection
          providerId="augment"
          providerName="Augment Rules"
          onSync={handleSyncToProvider}
          refreshTrigger={rulesRefreshTrigger}
        />
        <CustomRulesSection onSync={handleSyncToProvider} refreshTrigger={rulesRefreshTrigger} />
      </section>

      {importModalOpen && (
        <Modal isOpen onClose={() => setImportModalOpen(false)} aria-labelledby="import-rule-modal-title">
            <ImportRuleModal
              onClose={() => setImportModalOpen(false)}
              onImport={() => {
                showToast('Rules imported');
                setRulesRefreshTrigger((t) => t + 1);
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
        </Modal>
      )}
    </>
  );
}
