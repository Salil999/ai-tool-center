import { useState, useEffect } from 'react';
import { getProjectDirectories } from '../../api-client';
import type { ProjectDirectory } from '../../types';

interface ClaudeSyncModalProps {
  onClose: () => void;
  onSyncUser: () => void;
  onSyncLocal: (projectId: string) => void;
  onSyncProject: (projectId: string) => void;
}

export function ClaudeSyncModal({
  onClose,
  onSyncUser,
  onSyncLocal,
  onSyncProject,
}: ClaudeSyncModalProps) {
  const [scope, setScope] = useState<'user' | 'local' | 'project'>('user');
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
    if ((scope === 'local' || scope === 'project') && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [scope, projects, selectedProjectId]);

  const handleConfirm = () => {
    if (scope === 'user') {
      onSyncUser();
    } else if ((scope === 'local' || scope === 'project') && selectedProjectId) {
      if (scope === 'local') {
        onSyncLocal(selectedProjectId);
      } else {
        onSyncProject(selectedProjectId);
      }
    }
    onClose();
  };

  const needsProject = scope === 'local' || scope === 'project';
  const canConfirm =
    scope === 'user' || (needsProject && selectedProjectId.length > 0);

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="claude-sync-modal-title">Sync to Claude Code</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="skill-editor-desc">
          Claude Code supports User, Local, and Project scopes. Choose where to sync.{' '}
          <a
            href="https://code.claude.com/docs/en/mcp#mcp-installation-scopes"
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
              name="claude-scope"
              checked={scope === 'user'}
              onChange={() => setScope('user')}
            />
            <span>User</span>
            <span className="cursor-sync-path">~/.claude.json (mcpServers)</span>
          </label>
        </div>
        <div className="form-group">
          <label className="cursor-sync-option">
            <input
              type="radio"
              name="claude-scope"
              checked={scope === 'local'}
              onChange={() => setScope('local')}
              disabled={projects.length === 0}
            />
            <span>Local</span>
            {projects.length === 0 && !loading && (
              <span className="cursor-sync-hint">Add projects in Settings to sync to a project.</span>
            )}
          </label>
          {scope === 'local' && projects.length > 0 && (
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
        <div className="form-group">
          <label className="cursor-sync-option">
            <input
              type="radio"
              name="claude-scope"
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
