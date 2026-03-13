import { useState, useEffect, useCallback } from 'react';
import { ProviderRuleList } from './ProviderRuleList';
import { AddProviderRuleModal } from './AddProviderRuleModal';
import { EditProviderRuleModal } from './EditProviderRuleModal';
import { SyncConfirmModal } from '@/components/shared/SyncConfirmModal';
import {
  getProviderRules,
  deleteProviderRule,
  reorderProviderRules,
} from '../../api-client';
import type { ProviderRule } from '../../types';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/shared/Modal';

interface ProviderRulesSectionProps {
  providerId: string;
  providerName: string;
  /** When provided, shows a Sync button that syncs this provider's rules to its target path */
  onSync?: (providerId: string) => void | Promise<void>;
  /** When this changes, rules are reloaded (e.g. after import) */
  refreshTrigger?: number;
  /** When true, show Sync for Copilot (used when syncing to a project) */
  showSyncForCopilot?: boolean;
}

export function ProviderRulesSection({
  providerId,
  providerName,
  onSync,
  refreshTrigger,
  showSyncForCopilot = false,
}: ProviderRulesSectionProps) {
  const { showToast } = useToast();
  const [rules, setRules] = useState<ProviderRule[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    const list = await getProviderRules(providerId);
    setRules(list);
  }, [providerId]);

  useEffect(() => {
    loadRules();
  }, [loadRules, refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProviderRule(providerId, id);
      showToast('Rule removed');
      loadRules();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReorder = async (order: string[]) => {
    await reorderProviderRules(providerId, order);
    showToast('Order updated');
    loadRules();
  };

  const handleSyncClick = () => {
    if (onSync) setSyncConfirmOpen(true);
  };

  const handleSyncConfirm = async () => {
    if (!onSync) return;
    setSyncing(true);
    try {
      await onSync(providerId);
    } finally {
      setSyncing(false);
    }
  };

  const editRule = editRuleId ? rules.find((r) => r.id === editRuleId) : null;

  return (
    <div className="provider-rules-section">
      <div className="provider-rules-header">
        <h3>{providerName}</h3>
        <p className="provider-rules-desc">
          {providerId === 'cursor' ? (
            <>
              Project rules in <code>.cursor/rules</code>. Supports <code>.md</code> and <code>.mdc</code> with
              frontmatter (description, globs, alwaysApply). See{' '}
              <a href="https://cursor.com/docs/rules" target="_blank" rel="noopener noreferrer">
                Cursor docs
              </a>
              .
            </>
          ) : providerId === 'augment' ? (
            <>
              Rules in <code>.augment/rules</code>. Supports Always, Manual, and Auto types. See{' '}
              <a href="https://docs.augmentcode.com/setup-augment/guidelines" target="_blank" rel="noopener noreferrer">
                Augment docs
              </a>
              .
            </>
          ) : providerId === 'windsurf' ? (
            <>
              Rules in <code>.windsurf/rules</code>. Global: <code>~/.codeium/windsurf/rules</code>. See{' '}
              <a href="https://docs.windsurf.com" target="_blank" rel="noopener noreferrer">
                Windsurf docs
              </a>
              .
            </>
          ) : providerId === 'continue' ? (
            <>
              Rules in <code>.continue/rules</code>. Global: <code>~/.continue/rules</code>. See{' '}
              <a href="https://docs.continue.dev/customize/deep-dives/rules" target="_blank" rel="noopener noreferrer">
                Continue docs
              </a>
              .
            </>
          ) : providerId === 'copilot' ? (
            <>
              Repository instructions in <code>.github/copilot-instructions.md</code>. Sync to project only. See{' '}
              <a href="https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot" target="_blank" rel="noopener noreferrer">
                GitHub Copilot docs
              </a>
              .
            </>
          ) : (
            <>Custom rules configuration. Synced to your specified path.</>
          )}
        </p>
        <div className="provider-rules-header-actions">
          {onSync && (providerId !== 'copilot' || showSyncForCopilot) && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSyncClick}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddModalOpen(true)}>
            Add Rule
          </button>
        </div>
      </div>
      <ProviderRuleList
        rules={rules}
        onEdit={(id) => setEditRuleId(id)}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {syncConfirmOpen && (
        <SyncConfirmModal
          isOpen
          onClose={() => setSyncConfirmOpen(false)}
          onConfirm={handleSyncConfirm}
        />
      )}

      {addModalOpen && (
        <Modal isOpen onClose={() => setAddModalOpen(false)} aria-labelledby="add-provider-rule-modal-title">
          <AddProviderRuleModal
              providerId={providerId}
              providerName={providerName}
              onClose={() => setAddModalOpen(false)}
              onSaved={() => {
                showToast('Rule created');
                loadRules();
              }}
            />
        </Modal>
      )}

      {editRule && (
        <Modal isOpen onClose={() => setEditRuleId(null)} aria-labelledby="edit-provider-rule-modal-title">
          <EditProviderRuleModal
              providerId={providerId}
              providerName={providerName}
              ruleId={editRule.id}
              ruleName={editRule.name}
              onClose={() => setEditRuleId(null)}
              onSaved={() => {
                showToast('Rule updated');
                loadRules();
              }}
            />
        </Modal>
      )}
    </div>
  );
}
