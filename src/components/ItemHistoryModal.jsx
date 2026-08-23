import React, { useState, useEffect, useMemo } from 'react';
import RiskFormModal from './RiskFormModal';
import { RotateCcw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const ItemHistoryModal = ({ risk, onClose, onRestore }) => {
  const snapshots = risk.snapshots || [];
  const [confirmRestoreId, setConfirmRestoreId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSnapId, setSelectedSnapId] = useState(null);

  // Group snapshots by date
  const groupedSnapshots = useMemo(() => {
    const groups = {};
    snapshots.forEach(s => {
      const d = new Date(s.date).toLocaleDateString();
      if (!groups[d]) groups[d] = [];
      groups[d].push(s);
    });
    return groups;
  }, [risk.snapshots]);
  
  // Sort dates descending
  const dates = useMemo(() => Object.keys(groupedSnapshots).sort((a, b) => new Date(b) - new Date(a)), [groupedSnapshots]);

  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    const snapsOnDate = groupedSnapshots[selectedDate];
    if (snapsOnDate && !snapsOnDate.find(s => s.id === selectedSnapId)) {
      setSelectedSnapId(snapsOnDate[snapsOnDate.length - 1].id);
    }
  }, [selectedDate, selectedSnapId, groupedSnapshots]);

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

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapId) || snapshots[0];

  const handleRestore = async () => {
    if (onRestore) {
      await onRestore(selectedSnapshot);
      setConfirmRestoreId(null);
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

        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem' }} onClick={() => setConfirmRestoreId(selectedSnapshot.id)}>
          <RotateCcw size={14} /> Restore
        </button>
      </div>
    </div>
  );

  return (
    <>
      <RiskFormModal
        key={selectedSnapId}
        initialRisk={selectedSnapshot.data}
        readOnly={true}
        customHeader={customHeader}
        onClose={onClose}
      />
      <ConfirmModal
        isOpen={!!confirmRestoreId}
        onClose={() => setConfirmRestoreId(null)}
        onConfirm={handleRestore}
        title="Restore Version"
        message={`Are you sure you want to restore this version from ${selectedSnapshot ? new Date(selectedSnapshot.date).toLocaleString() : ''}? This will overwrite the current item.`}
        confirmText="Restore"
      />
    </>
  );
};

export default ItemHistoryModal;
