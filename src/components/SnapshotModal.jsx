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
      <div className="modal-content card" style={{ maxWidth: '450px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', whiteSpace: 'nowrap' }}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.3rem 0.65rem', fontSize: '0.85rem' }}>Cancel</button>
            <button type="submit" form="snapshot-form" className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }} disabled={saving || !note.trim()}>{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
        </div>
        
        <form id="snapshot-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
        </form>
      </div>
    </div>
  );
};

export default SnapshotModal;
