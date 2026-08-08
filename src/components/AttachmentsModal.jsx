import React from 'react';
import { X, File, Plus, Trash2 } from 'lucide-react';

const AttachmentsModal = ({ risk, onClose, onAttachmentAdded, onAttachmentRemoved }) => {
  const handleAdd = async () => {
    try {
      const newAttachment = await window.electron.ipcRenderer.invoke('api-add-attachment', risk.id);
      if (newAttachment) {
        onAttachmentAdded(newAttachment);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add attachment');
    }
  };

  const handleOpen = async (filename) => {
    try {
      await window.electron.ipcRenderer.invoke('api-open-attachment', filename);
    } catch (err) {
      console.error(err);
      alert('Failed to open attachment');
    }
  };

  const handleDelete = async (e, attachmentId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this attachment?')) return;
    try {
      await window.electron.ipcRenderer.invoke('api-delete-attachment', risk.id, attachmentId);
      onAttachmentRemoved(attachmentId);
    } catch (err) {
      console.error(err);
      alert('Failed to delete attachment');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Attachments: {risk.title}</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {!risk.attachments || risk.attachments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
              No attachments yet.
            </div>
          ) : (
            risk.attachments.map(att => (
              <div 
                key={att.id} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', 
                  padding: '1rem', background: 'var(--surface)', 
                  border: '1px solid var(--border)', borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => handleOpen(att.filename)}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <File size={24} color="var(--primary)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>{att.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Added {new Date(att.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  className="btn btn-icon" 
                  onClick={(e) => handleDelete(e, att.id)} 
                  style={{ marginLeft: 'auto', padding: '0.25rem' }}
                  title="Remove attachment"
                >
                  <Trash2 size={18} color="var(--danger)" />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={onClose}>Close</button>
          <button className="btn" onClick={handleAdd}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Add Attachment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachmentsModal;
