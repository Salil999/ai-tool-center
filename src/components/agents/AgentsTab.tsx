import { useState, useEffect, useCallback } from 'react';
import { ImportAgentsModal } from './ImportAgentsModal';
import { RuleEditorModal } from '../rules/RuleEditorModal';
import { AddAgentsModal } from '../rules/AddAgentsModal';
import { syncRulesToProject, getAgentRules, deleteAgentRule } from '../../api-client';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/shared/Modal';
import { SyncConfirmModal } from '@/components/shared/SyncConfirmModal';

interface AgentRuleItem {
  id: string;
  projectPath: string;
  name?: string;
}

export function AgentsTab() {
  const { showToast } = useToast();
  const [editorAgent, setEditorAgent] = useState<AgentRuleItem | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [agentRules, setAgentRules] = useState<AgentRuleItem[]>([]);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [pendingSyncAction, setPendingSyncAction] = useState<() => Promise<void>>(() => async () => {});

  const loadAgentRules = useCallback(() => {
    getAgentRules().then((list) => setAgentRules(list)).catch(() => {});
  }, []);

  useEffect(() => {
    loadAgentRules();
  }, [loadAgentRules]);

  useEffect(() => {
    if (importModalOpen || addModalOpen) loadAgentRules();
  }, [importModalOpen, addModalOpen, loadAgentRules]);

  const handleSyncToProject = async (
    agentId: string,
    options?: { providerId?: string; sourceAgentId?: string }
  ) => {
    try {
      const result = await syncRulesToProject(agentId, options);
      if (options?.providerId) {
        const count = result.syncedCount;
        showToast(
          count !== undefined
            ? `Synced ${count} rule(s) to project`
            : 'Rules synced to project'
        );
      } else {
        showToast('AGENTS.md synced to project');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const requestSync = (action: () => Promise<void>) => {
    setPendingSyncAction(() => action);
    setSyncConfirmOpen(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await deleteAgentRule(agentId);
      showToast('AGENTS.md removed');
      loadAgentRules();
      if (editorAgent?.id === agentId) setEditorAgent(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <>
      {syncConfirmOpen && (
        <SyncConfirmModal
          isOpen
          onClose={() => setSyncConfirmOpen(false)}
          onConfirm={pendingSyncAction}
        />
      )}
      <div className="servers-section-header">
        <h2>AGENTS.md</h2>
        <div className="header-actions">
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
            Add AGENTS.md
          </button>
        </div>
      </div>

      <section className="rules-section rules-section-agents">
        {agentRules.length === 0 ? (
          <p className="rules-section-empty">
            Click &quot;Add AGENTS.md&quot; to create your first AGENTS.md. Pick a project path and edit the content.
          </p>
        ) : (
          <ul className="agents-project-list">
            {agentRules.map((a) => (
              <li key={a.id} className="agents-project-item">
                <span className="agents-project-name" title={a.projectPath}>
                  {a.name || a.projectPath}
                </span>
                <div className="agents-project-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setEditorAgent(a)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() =>
                      requestSync(() => handleSyncToProject(a.id, { sourceAgentId: a.id }))
                    }
                  >
                    Sync to project
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteAgent(a.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {addModalOpen && (
        <Modal isOpen onClose={() => setAddModalOpen(false)} aria-labelledby="add-agents-modal-title">
          <AddAgentsModal
            onClose={() => setAddModalOpen(false)}
            onSaved={() => {
              showToast('AGENTS.md added');
              loadAgentRules();
            }}
          />
        </Modal>
      )}

      {importModalOpen && (
        <Modal isOpen onClose={() => setImportModalOpen(false)} aria-labelledby="import-agents-modal-title">
          <ImportAgentsModal
            onClose={() => setImportModalOpen(false)}
            onImport={() => {
              showToast('AGENTS.md imported');
              loadAgentRules();
            }}
            onError={(msg) => showToast(msg, 'error')}
          />
        </Modal>
      )}

      {editorAgent && (
        <Modal isOpen onClose={() => setEditorAgent(null)} aria-labelledby="rule-editor-modal-title">
          <RuleEditorModal
              agentId={editorAgent.id}
              agentName={editorAgent.name || editorAgent.projectPath}
              onClose={() => setEditorAgent(null)}
              onSaved={() => {
                showToast('AGENTS.md updated');
              }}
            />
        </Modal>
      )}
    </>
  );
}
