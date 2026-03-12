import { useState, useEffect } from 'react';
import {
  getProjectDirectories,
  addProjectDirectory,
  updateProjectDirectory,
  deleteProjectDirectory,
} from '../api';

interface ProjectDir {
  id: string;
  path: string;
  name?: string;
}

export function ProjectDirectoriesSection() {
  const [projects, setProjects] = useState<ProjectDir[]>([]);
  const [addPath, setAddPath] = useState('');
  const [addName, setAddName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPath, setEditPath] = useState('');
  const [editName, setEditName] = useState('');

  const load = () => {
    getProjectDirectories().then((list) => setProjects(list as ProjectDir[])).catch(() => {});
  };

  useEffect(() => load(), []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPath.trim()) return;
    try {
      await addProjectDirectory({ path: addPath.trim(), name: addName.trim() || undefined });
      setAddPath('');
      setAddName('');
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleEdit = (p: ProjectDir) => {
    setEditingId(p.id);
    setEditPath(p.path);
    setEditName(p.name || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await updateProjectDirectory(editingId, {
        path: editPath.trim(),
        name: editName.trim() || undefined,
      });
      setEditingId(null);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this project directory?')) return;
    try {
      await deleteProjectDirectory(id);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="project-directories-section">
      <h3>Project Directories</h3>
      <p className="project-directories-desc">
        Save project paths to sync skills to <code>.agents/skills/</code> in each project.
      </p>
      <form onSubmit={handleAdd} className="project-directories-add">
        <input
          type="text"
          placeholder="Path (e.g. ~/my-project)"
          value={addPath}
          onChange={(e) => setAddPath(e.target.value)}
          className="project-dir-input"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          className="project-dir-input project-dir-name"
        />
        <button type="submit" className="btn btn-sm btn-primary">
          Add
        </button>
      </form>
      <ul className="project-directories-list">
        {projects.map((p) => (
          <li key={p.id} className="project-dir-item">
            {editingId === p.id ? (
              <form onSubmit={handleSaveEdit} className="project-dir-edit-form">
                <input
                  type="text"
                  value={editPath}
                  onChange={(e) => setEditPath(e.target.value)}
                  className="project-dir-input"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  className="project-dir-input project-dir-name"
                />
                <button type="submit" className="btn btn-sm">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span className="project-dir-display" title={p.path}>
                  {p.name || p.path}
                </span>
                <div className="project-dir-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {projects.length === 0 && (
        <p className="project-directories-empty">No project directories saved.</p>
      )}
    </div>
  );
}
