import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SnapshotModal = ({ onClose, onSave, title = "Create Snapshot" }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-focus input on mount
  useEffect(() => {
    const el = document.getElementById('snapshot-note-input');
    if (el) el.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onSave(note.trim());
    setSaving(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Snapshot Note</label>
            <input 
              id="snapshot-note-input"
              type="text" 
              className="form-input" 
              placeholder="e.g. August RIOMB, Post-mitigation..." 
              value={note}
              onChange={e => setNote(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>Cancel</button>
            <button type="submit" className="btn" disabled={saving || !note.trim()}>{saving ? 'Saving...' : 'Save Snapshot'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SnapshotModal;
