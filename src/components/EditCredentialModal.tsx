import { useState, useEffect } from 'react';
import { getCredential, updateCredential } from '../api';

interface EditCredentialModalProps {
  credentialId: string;
  onClose: () => void;
  onSaved: () => void;
  showToast?: (message: string, type?: string) => void;
}

export function EditCredentialModal({
  credentialId,
  onClose,
  onSaved,
  showToast,
}: EditCredentialModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCredential(credentialId)
      .then((cred) => {
        setName(cred.name);
        setValue(cred.value);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [credentialId]);

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
      await updateCredential(credentialId, { name: trimmedName, value });
      showToast?.('Credential updated');
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="modal edit-modal">
        <div className="modal-header">
          <h2>Edit Credential</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2>Edit Credential</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="edit-cred-name">Key name</label>
          <input
            id="edit-cred-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. OPENAI_API_KEY"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-cred-value">Key value</label>
          <input
            id="edit-cred-value"
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
