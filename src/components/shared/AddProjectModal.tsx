import { useState } from 'react';
import { addProjectDirectory } from '../../api-client';

interface AddProjectModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddProjectModal({ onClose, onSaved }: AddProjectModalProps) {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addProjectDirectory({ path: path.trim(), name: name.trim() || undefined });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="add-project-modal-title">Add Project</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <p className="skill-editor-desc">
          Add a project directory to sync rules and skills to. The path should point to your project root (e.g. <code>~/my-project</code>).
        </p>
        <div className="form-group">
          <label htmlFor="project-path">Path</label>
          <input
            id="project-path"
            type="text"
            className="form-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. ~/my-project"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="project-name">Name (optional)</label>
          <input
            id="project-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name for the project"
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!path.trim() || saving}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
