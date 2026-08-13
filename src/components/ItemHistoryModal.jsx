import React, { useState, useEffect } from 'react';
import RiskFormModal from './RiskFormModal';
import { RotateCcw } from 'lucide-react';

const ItemHistoryModal = ({ risk, onClose, onRestore }) => {
  const snapshots = risk.snapshots || [];
  
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

  // Group snapshots by date
  const groupedSnapshots = {};
  snapshots.forEach(s => {
    const d = new Date(s.date).toLocaleDateString();
    if (!groupedSnapshots[d]) groupedSnapshots[d] = [];
    groupedSnapshots[d].push(s);
  });
  
  // Sort dates descending
  const dates = Object.keys(groupedSnapshots).sort((a, b) => new Date(b) - new Date(a));
  
  // Default to newest date and newest snapshot
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedSnapId, setSelectedSnapId] = useState(() => {
    const snapsOnDate = groupedSnapshots[dates[0]];
    return snapsOnDate[snapsOnDate.length - 1].id;
  });

  useEffect(() => {
    const snapsOnDate = groupedSnapshots[selectedDate];
    if (snapsOnDate && !snapsOnDate.find(s => s.id === selectedSnapId)) {
      setSelectedSnapId(snapsOnDate[snapsOnDate.length - 1].id);
    }
  }, [selectedDate, selectedSnapId, groupedSnapshots]);

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapId) || snapshots[0];

  const handleRestore = async () => {
    if (window.confirm(`Are you sure you want to restore this version from ${new Date(selectedSnapshot.date).toLocaleString()}? This will overwrite the current item.`)) {
      if (onRestore) {
        await onRestore(selectedSnapshot);
      }
    }
  };

  const customHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, paddingRight: '1rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Item History</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{risk.userRiskId} - {risk.title}</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <select 
          className="form-input" 
          style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        
        <select 
          className="form-input" 
          style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          value={selectedSnapId}
          onChange={(e) => setSelectedSnapId(Number(e.target.value))}
        >
          {(groupedSnapshots[selectedDate] || []).slice().reverse().map(snap => (
            <option key={snap.id} value={snap.id}>
              {new Date(snap.date).toLocaleTimeString()} - {snap.note}
            </option>
          ))}
        </select>

        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem' }} onClick={handleRestore}>
          <RotateCcw size={14} /> Restore
        </button>
      </div>
    </div>
  );

  return (
    <RiskFormModal
      key={selectedSnapId}
      initialRisk={selectedSnapshot.data}
      readOnly={true}
      customHeader={customHeader}
      onClose={onClose}
    />
  );
};

export default ItemHistoryModal;
