import { useState, useEffect, useCallback } from 'react';
import { ProviderRuleList } from './ProviderRuleList';
import { AddProviderRuleModal } from './AddProviderRuleModal';
import { EditProviderRuleModal } from './EditProviderRuleModal';
import {
  getProviderRules,
  deleteProviderRule,
  reorderProviderRules,
} from '../../api-client';
import type { ProviderRule } from '../../types';

interface ProviderRulesSectionProps {
  providerId: string;
  providerName: string;
  showToast: (message: string, type?: string) => void;
}

export function ProviderRulesSection({
  providerId,
  providerName,
  showToast,
}: ProviderRulesSectionProps) {
  const [rules, setRules] = useState<ProviderRule[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    const list = await getProviderRules(providerId);
    setRules(list);
  }, [providerId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleDelete = async (id: string) => {
    await deleteProviderRule(providerId, id);
    showToast('Rule removed');
    loadRules();
  };

  const handleReorder = async (order: string[]) => {
    await reorderProviderRules(providerId, order);
    showToast('Order updated');
    loadRules();
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
          ) : (
            <>Custom rules configuration. Synced to your specified path.</>
          )}
        </p>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddModalOpen(true)}>
          Add Rule
        </button>
      </div>
      <ProviderRuleList
        rules={rules}
        onEdit={(id) => setEditRuleId(id)}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AddProviderRuleModal
              providerId={providerId}
              providerName={providerName}
              onClose={() => setAddModalOpen(false)}
              onSaved={() => {
                showToast('Rule created');
                loadRules();
              }}
            />
          </div>
        </div>
      )}

      {editRule && (
        <div className="modal-overlay" onClick={() => setEditRuleId(null)}>
          <div onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}
    </div>
  );
}
