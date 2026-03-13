import { useState, useEffect, useCallback } from 'react';
import { RuleSyncSection } from '../rules/RuleSyncSection';
import { ImportRuleModal } from '../rules/ImportRuleModal';
import { RuleEditorModal } from '../rules/RuleEditorModal';
import { AddAgentsModal } from '../rules/AddAgentsModal';
import { syncRulesTo, syncRulesToProject, getAgentRules, deleteAgentRule } from '../../api-client';

interface AgentRuleItem {
  id: string;
  projectPath: string;
  name?: string;
}

interface AgentsTabProps {
  showToast: (message: string, type?: string) => void;
}

export function AgentsTab({ showToast }: AgentsTabProps) {
  const [editorAgent, setEditorAgent] = useState<AgentRuleItem | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [agentRules, setAgentRules] = useState<AgentRuleItem[]>([]);

  const loadAgentRules = useCallback(() => {
    getAgentRules().then((list) => setAgentRules(list)).catch(() => {});
  }, []);

  useEffect(() => {
    loadAgentRules();
  }, [loadAgentRules]);

  useEffect(() => {
    if (importModalOpen || addModalOpen) loadAgentRules();
  }, [importModalOpen, addModalOpen, loadAgentRules]);

  const handleSyncToProvider = async (target: string, sourceAgentId?: string) => {
    try {
      const result = await syncRulesTo(target, sourceAgentId);
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

  const handleSyncToProject = async (
    agentId: string,
    options?: { providerId?: string; sourceAgentId?: string }
  ) => {
    try {
      const result = await syncRulesToProject(agentId, options);
      const count = result.syncedCount;
      showToast(
        count !== undefined
          ? `Synced ${count} rule(s) to project`
          : 'Rules synced to project'
      );
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
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
      <div className="servers-section-header">
        <h2>AGENTS.md</h2>
        <div className="header-actions">
          <RuleSyncSection
            agentRules={agentRules}
            onSyncToProvider={handleSyncToProvider}
            onSyncToProject={handleSyncToProject}
            showAgentsTargets={true}
          />
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
                    onClick={() => handleSyncToProject(a.id, { sourceAgentId: a.id })}
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
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AddAgentsModal
              onClose={() => setAddModalOpen(false)}
              onSaved={() => {
                showToast('AGENTS.md added');
                loadAgentRules();
              }}
            />
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="modal-overlay" onClick={() => setImportModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ImportRuleModal
              onClose={() => setImportModalOpen(false)}
              onImport={() => {
                showToast('Rules imported');
                loadAgentRules();
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          </div>
        </div>
      )}

      {editorAgent && (
        <div className="modal-overlay" onClick={() => setEditorAgent(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <RuleEditorModal
              agentId={editorAgent.id}
              agentName={editorAgent.name || editorAgent.projectPath}
              onClose={() => setEditorAgent(null)}
              onSaved={() => {
                showToast('AGENTS.md updated');
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
