import React, { useState } from 'react';
import RiskFormModal from './RiskFormModal';

const ItemHistoryModal = ({ risk, onClose }) => {
  const snapshots = risk.snapshots || [];
  
  // If no snapshots, show a simple message modal.
  if (snapshots.length === 0) {
    return (
      <div className="modal-overlay">
        <div className="modal-content card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>No History Available</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            There are no snapshots saved for this item yet.
          </p>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  // Default to the most recent snapshot
  const [selectedSnapId, setSelectedSnapId] = useState(snapshots[snapshots.length - 1].id);
  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapId) || snapshots[0];

  const customHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, paddingRight: '1rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Item History</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{risk.userRiskId} - {risk.title}</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Viewing:</label>
        <select 
          className="form-input" 
          style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          value={selectedSnapId}
          onChange={(e) => setSelectedSnapId(Number(e.target.value))}
        >
          {snapshots.slice().reverse().map(snap => (
            <option key={snap.id} value={snap.id}>
              {new Date(snap.date).toLocaleDateString()} - {snap.note}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <RiskFormModal
      key={selectedSnapId} // Force full re-render when snapshot changes to cleanly update initialRisk
      initialRisk={selectedSnapshot.data}
      readOnly={true}
      customHeader={customHeader}
      onClose={onClose}
    />
  );
};

export default ItemHistoryModal;
