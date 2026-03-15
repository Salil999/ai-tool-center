import { useState, useEffect, useCallback } from 'react';
import {
  getProjectDirectories,
  addProjectDirectory,
  deleteProjectDirectory,
  reorderProjectDirectories,
} from '../../api-client';
import { AddProjectModal } from '@/components/shared/AddProjectModal';
import { EditProjectModal } from '@/components/shared/EditProjectModal';
import { Modal } from '@/components/shared/Modal';
import type { ProjectDirectory } from '../../types';

interface ProjectsTabProps {
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
  onClose?: () => void;
}

export function ProjectsTab({
  onError,
  onSuccess,
  onClose,
}: ProjectsTabProps) {
  const [projects, setProjects] = useState<ProjectDirectory[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    getProjectDirectories()
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => loadProjects(), [loadProjects]);

  const handleEdit = (p: ProjectDirectory) => setEditProjectId(p.id);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this project directory?')) return;
    try {
      await deleteProjectDirectory(id);
      onSuccess?.('Project removed');
      loadProjects();
    } catch (err) {
      onError?.((err as Error).message);
    }
  };

  const handleReorder = async (order: string[]) => {
    try {
      await reorderProjectDirectories(order);
      onSuccess?.('Project order updated');
      loadProjects();
    } catch (err) {
      onError?.((err as Error).message);
    }
  };

  const handleDragStart = (id: string) => setDraggedProjectId(id);
  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDropTargetProjectId(null);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedProjectId && draggedProjectId !== id) setDropTargetProjectId(id);
  };
  const handleDragLeave = () => setDropTargetProjectId(null);
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTargetProjectId(null);
    if (!draggedProjectId || draggedProjectId === targetId) return;
    const ids = projects.map((p) => p.id);
    const fromIndex = ids.indexOf(draggedProjectId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const newOrder = [...ids];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedProjectId);
    handleReorder(newOrder);
  };

  const editProject = editProjectId ? projects.find((p) => p.id === editProjectId) : null;

  return (
    <div className="projects-tab">
      <p className="settings-description">
        Manage project directories used for syncing skills, rules, and MCP config to specific projects.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setAddModalOpen(true)}
        style={{ marginBottom: '1rem' }}
      >
        Add Project
      </button>
      <ul className="project-directories-list settings-projects-list">
        {projects.map((p) => (
          <li
            key={p.id}
            className={`project-dir-item settings-project-item ${draggedProjectId === p.id ? 'dragging' : ''} ${dropTargetProjectId === p.id ? 'drop-target' : ''}`}
            onDragOver={(e) => handleDragOver(e, p.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, p.id)}
          >
            <span
              className="rules-drag-handle"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', p.id);
                handleDragStart(p.id);
              }}
              onDragEnd={handleDragEnd}
              title="Drag to reorder"
              aria-label="Drag to reorder"
              role="button"
              tabIndex={0}
            >
              ⋮⋮
            </span>
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
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(p.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {projects.length === 0 && (
        <p className="project-directories-empty">No project directories saved. Add one to sync skills and rules to specific projects.</p>
      )}

      {onClose && (
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      )}

      {addModalOpen && (
        <Modal
          isOpen
          onClose={() => setAddModalOpen(false)}
          aria-labelledby="add-project-modal-title"
        >
          <AddProjectModal
            onClose={() => setAddModalOpen(false)}
            onSaved={() => {
              setAddModalOpen(false);
              onSuccess?.('Project added');
              loadProjects();
            }}
          />
        </Modal>
      )}

      {editProject && (
        <Modal
          isOpen
          onClose={() => setEditProjectId(null)}
          aria-labelledby="edit-project-modal-title"
        >
          <EditProjectModal
            projectId={editProject.id}
            initialPath={editProject.path}
            initialName={editProject.name || ''}
            onClose={() => setEditProjectId(null)}
            onSaved={() => {
              setEditProjectId(null);
              onSuccess?.('Project updated');
              loadProjects();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
