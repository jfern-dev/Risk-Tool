import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '400px', padding: '1.5rem', textAlign: 'center' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: variant === 'danger' ? 'var(--danger)' : 'var(--warning)' }}>
          <AlertTriangle size={48} />
        </div>
        
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn" onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {cancelText}
          </button>
          <button 
            className="btn" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={variant === 'danger' ? { background: 'var(--danger)' } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
