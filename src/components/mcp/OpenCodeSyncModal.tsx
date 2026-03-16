import { useState, useEffect } from 'react';
import { getProjectDirectories } from '../../api-client';
import type { ProjectDirectory } from '../../types';

interface OpenCodeSyncModalProps {
  onClose: () => void;
  onSyncGlobal: () => void;
  onSyncProject: (projectId: string) => void;
}

export function OpenCodeSyncModal({
  onClose,
  onSyncGlobal,
  onSyncProject,
}: OpenCodeSyncModalProps) {
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<ProjectDirectory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectDirectories()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (scope === 'project' && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [scope, projects, selectedProjectId]);

  const handleConfirm = () => {
    if (scope === 'global') {
      onSyncGlobal();
    } else if (scope === 'project' && selectedProjectId) {
      onSyncProject(selectedProjectId);
    }
    onClose();
  };

  const canConfirm =
    scope === 'global' || (scope === 'project' && selectedProjectId.length > 0);

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="opencode-sync-modal-title">Sync to OpenCode</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="skill-editor-desc">
          OpenCode supports global and project-specific MCP configuration. Choose where to sync.{' '}
          <a
            href="https://open-code.ai/docs/en/config#locations"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </p>
        <div className="form-group">
          <label className="cursor-sync-option">
            <input
              type="radio"
              name="opencode-scope"
              checked={scope === 'global'}
              onChange={() => setScope('global')}
            />
            <span>Global</span>
            <span className="cursor-sync-path">~/.config/opencode/opencode.json</span>
          </label>
        </div>
        <div className="form-group">
          <label className="cursor-sync-option">
            <input
              type="radio"
              name="opencode-scope"
              checked={scope === 'project'}
              onChange={() => setScope('project')}
              disabled={projects.length === 0}
            />
            <span>Project</span>
            {projects.length === 0 && !loading && (
              <span className="cursor-sync-hint">Add projects in Settings to sync to a project.</span>
            )}
          </label>
          {scope === 'project' && projects.length > 0 && (
            <select
              className="form-input cursor-sync-project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              aria-label="Select project"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.path}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Sync
          </button>
        </div>
      </div>
    </div>
  );
}
