import { useState } from 'react';
import { createCredential } from '../api';

interface AddCredentialModalProps {
  onClose: () => void;
  onSaved: () => void;
  showToast?: (message: string, type?: string) => void;
}

export function AddCredentialModal({ onClose, onSaved, showToast }: AddCredentialModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Key name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCredential({ name: trimmedName, value });
      showToast?.('Credential added');
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
        <h2>Add API Credential</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="cred-name">Key name</label>
          <input
            id="cred-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. OPENAI_API_KEY"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="cred-value">Key value</label>
          <input
            id="cred-value"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your API key or secret"
            autoComplete="new-password"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
