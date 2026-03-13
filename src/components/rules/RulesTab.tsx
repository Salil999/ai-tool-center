import { useState, useEffect, useCallback } from 'react';
import { RuleSyncSection } from './RuleSyncSection';
import { ImportRuleModal } from './ImportRuleModal';
import { ProviderRulesSection } from './ProviderRulesSection';
import { CustomRulesSection } from './CustomRulesSection';
import { syncRulesTo, syncRulesToProject, getAgentRules } from '../../api-client';

interface AgentRuleItem {
  id: string;
  projectPath: string;
  name?: string;
}

interface RulesTabProps {
  showToast: (message: string, type?: string) => void;
}

export function RulesTab({ showToast }: RulesTabProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [agentRules, setAgentRules] = useState<AgentRuleItem[]>([]);

  const loadAgentRules = useCallback(() => {
    getAgentRules().then((list) => setAgentRules(list)).catch(() => {});
  }, []);

  useEffect(() => {
    loadAgentRules();
  }, [loadAgentRules]);

  useEffect(() => {
    if (importModalOpen) loadAgentRules();
  }, [importModalOpen, loadAgentRules]);

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

  return (
    <>
      <div className="servers-section-header">
        <h2>Rules</h2>
        <div className="header-actions">
          <RuleSyncSection
            agentRules={agentRules}
            onSyncToProvider={handleSyncToProvider}
            onSyncToProject={handleSyncToProject}
            showAgentsTargets={false}
          />
          <button type="button" className="btn" onClick={() => setImportModalOpen(true)}>
            Import
          </button>
        </div>
      </div>

      <section className="rules-section rules-section-providers">
        <ProviderRulesSection
          providerId="cursor"
          providerName="Cursor Rules"
          showToast={showToast}
        />
        <ProviderRulesSection
          providerId="augment"
          providerName="Augment Rules"
          showToast={showToast}
        />
        <CustomRulesSection showToast={showToast} />
      </section>

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
    </>
  );
}
