import { useState, useRef, useEffect } from 'react';
import { importAgentsFromCustomPath } from '../../api-client';

interface ImportAgentsModalProps {
  onClose: () => void;
  onImport: () => void;
  onError?: (msg: string) => void;
}

export function ImportAgentsModal({ onClose, onImport, onError }: ImportAgentsModalProps) {
  const [projectPath, setProjectPath] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = projectPath.trim();
    if (!path) return;
    setError(null);
    setImporting(true);
    try {
      await importAgentsFromCustomPath(path);
      onImport();
      onClose();
    } catch (err) {
      setImporting(false);
      const msg = (err as Error).message;
      if (msg.includes('No AGENTS.md') || msg.includes('not found')) {
        setError('AGENTS.md not found in that directory.');
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="modal edit-modal import-modal">
      <div className="modal-header">
        <h2 id="import-agents-modal-title">Import AGENTS.md</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <p className="import-intro">
          AGENTS.md is project-scoped. Enter the project directory to import AGENTS.md from.
        </p>

        <div className="form-group">
          <label htmlFor="import-agent-project-path">Project directory</label>
          <input
            ref={inputRef}
            type="text"
            id="import-agent-project-path"
            value={projectPath}
            onChange={(e) => {
              setProjectPath(e.target.value);
              setError(null);
            }}
            placeholder="~/my-project or /path/to/project"
            disabled={importing}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!projectPath.trim() || importing}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </form>
    </div>
  );
}
