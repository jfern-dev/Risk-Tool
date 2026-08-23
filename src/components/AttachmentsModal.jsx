import React from 'react';
import { X, File, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const AttachmentsModal = ({ risk, onClose, onAttachmentAdded, onAttachmentRemoved }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleAdd = async () => {
    try {
      const newAttachment = await window.electron.ipcRenderer.invoke('api-add-attachment', risk.id);
      if (newAttachment) {
        onAttachmentAdded(newAttachment);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to add attachment');
    }
  };

  const handleOpen = async (filename) => {
    try {
      await window.electron.ipcRenderer.invoke('api-open-attachment', filename);
    } catch (err) {
      console.error(err);
      toast.error('Failed to open attachment');
    }
  };

  const handleRemove = async (attachmentId) => {
    try {
      await window.electron.ipcRenderer.invoke('api-delete-attachment', risk.id, attachmentId);
      onAttachmentRemoved(attachmentId);
      setConfirmDeleteId(null);
      toast.success('Attachment deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete attachment');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Attachments: {risk.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={handleAdd}>
              <Plus size={14} style={{ marginRight: '4px' }} />
              Add Attachment
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {!risk.attachments || risk.attachments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '6px', fontSize: '0.85rem' }}>
              No attachments yet. Click "Add Attachment" above to upload files.
            </div>
          ) : (
            risk.attachments.map(att => (
              <div 
                key={att.id} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  padding: '0.65rem 0.85rem', background: 'var(--surface)', 
                  border: '1px solid var(--border)', borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => handleOpen(att.filename)}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <File size={20} color="var(--primary)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{att.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Added {new Date(att.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  className="btn btn-icon" 
                  title="Remove Attachment" 
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(att.id); }}
                  style={{ marginLeft: 'auto', padding: '0.25rem' }}
                >
                  <Trash2 size={16} color="var(--danger)" />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={onClose}>Close</button>
        </div>
      </div>
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => handleRemove(confirmDeleteId)}
        title="Remove Attachment"
        message="Are you sure you want to remove this attachment? This action cannot be undone."
        confirmText="Remove"
      />
    </div>
  );
};

export default AttachmentsModal;
