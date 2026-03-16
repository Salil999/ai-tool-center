import { useState } from 'react';
import { updateProjectDirectory } from '../../api-client';

interface EditProjectModalProps {
  projectId: string;
  initialPath: string;
  initialName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProjectModal({
  projectId,
  initialPath,
  initialName,
  onClose,
  onSaved,
}: EditProjectModalProps) {
  const [path, setPath] = useState(initialPath);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateProjectDirectory(projectId, {
        path: path.trim(),
        name: name.trim() || undefined,
      });
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
        <h2 id="edit-project-modal-title">Edit Project</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="edit-project-path">Path</label>
          <input
            id="edit-project-path"
            type="text"
            className="form-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. ~/my-project"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-project-name">Name (optional)</label>
          <input
            id="edit-project-name"
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
