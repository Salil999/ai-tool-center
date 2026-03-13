import { useState, useEffect, useCallback } from 'react';
import { ProviderRulesSection } from './ProviderRulesSection';
import { AddCustomConfigModal } from './AddCustomConfigModal';
import { getCustomRuleConfigs, deleteCustomRuleConfig } from '../../api-client';

interface CustomConfig {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: '.md' | '.mdc';
}

interface CustomRulesSectionProps {
  showToast: (message: string, type?: string) => void;
}

export function CustomRulesSection({ showToast }: CustomRulesSectionProps) {
  const [configs, setConfigs] = useState<CustomConfig[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const loadConfigs = useCallback(() => {
    getCustomRuleConfigs().then(setConfigs).catch(() => {});
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleDelete = async (configId: string) => {
    try {
      await deleteCustomRuleConfig(configId);
      showToast('Custom configuration removed');
      loadConfigs();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <div className="custom-rules-section">
      <div className="provider-rules-header">
        <h3>Custom configurations</h3>
        <p className="provider-rules-desc">
          Add your own rule configurations with custom paths. Rules are stored in ~/.ai_tools_manager and synced to
          your specified location.
        </p>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddModalOpen(true)}>
          Add custom configuration
        </button>
      </div>

      {configs.map((c) => (
        <div key={c.id} className="custom-config-block">
          <div className="custom-config-header">
            <span className="custom-config-name">{c.name}</span>
            <span className="custom-config-path" title={c.path}>
              {c.path}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => handleDelete(c.id)}
            >
              Remove
            </button>
          </div>
          <ProviderRulesSection
            providerId={`custom-${c.id}`}
            providerName={c.name}
            showToast={showToast}
          />
        </div>
      ))}

      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AddCustomConfigModal
              onClose={() => setAddModalOpen(false)}
              onSaved={() => {
                showToast('Custom configuration added');
                loadConfigs();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
