import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, TrendingDown, ChevronDown, FolderOpen, FilePlus, Clock, Camera, Download, ArrowUpRight, ArrowDownRight, Minus, Pencil, Save } from 'lucide-react';
import RiskMatrix, { getScoreClass, getOppScoreClass, getIssueScoreClass } from '../components/RiskMatrix';
import RiskFormModal from '../components/RiskFormModal';
import BurndownModal from '../components/BurndownModal';
import RiskTimeline from '../components/RiskTimeline';
import AttachmentsModal from '../components/AttachmentsModal';
import StatusLogModal from '../components/StatusLogModal';
import SnapshotModal from '../components/SnapshotModal';
import ItemHistoryModal from '../components/ItemHistoryModal';
import RiskDetailsModal from '../components/RiskDetailsModal';
import { apiFetch } from '../utils/api';

const Dashboard = () => {
  const [risks, setRisks] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('current');
  const [activeItemType, setActiveItemType] = useState('Risk');
  const [activeLevelFilter, setActiveLevelFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBurndownRisk, setActiveBurndownRisk] = useState(null);
  const [activeAttachmentsRisk, setActiveAttachmentsRisk] = useState(null);
  const [activeStatusLogRisk, setActiveStatusLogRisk] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [itemToSnapshot, setItemToSnapshot] = useState(null);
  const [activeHistoryRisk, setActiveHistoryRisk] = useState(null);
  const [isGlobalSnapshotModalOpen, setIsGlobalSnapshotModalOpen] = useState(false);
  const [activeRiskDetails, setActiveRiskDetails] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    try {
      const [resRisks, resSnaps] = await Promise.all([
        apiFetch('http://localhost:3000/api/risks'),
        apiFetch('http://localhost:3000/api/snapshots')
      ]);
      const dataRisks = await resRisks.json();
      const dataSnaps = await resSnaps.json();
      
      setRisks(Array.isArray(dataRisks) ? dataRisks : []);
      setSnapshots(Array.isArray(dataSnaps) ? dataSnaps : []);
    } catch (err) {
      console.error(err);
      setRisks([]);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGlobalSnapshot = async (note) => {
    try {
      const res = await apiFetch('http://localhost:3000/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (res.ok) {
        const newSnap = await res.json();
        setSnapshots([...snapshots, newSnap]);
        setSelectedSnapshotId(newSnap.id.toString());
        setIsGlobalSnapshotModalOpen(false);
      }
    } catch (err) {
      alert('Failed to create global snapshot');
    }
  };

  const handleCreateItemSnapshot = async (note) => {
    try {
      const res = await apiFetch(`http://localhost:3000/api/risks/${itemToSnapshot.id}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (res.ok) {
        const newSnap = await res.json();
        const updatedRisk = { ...itemToSnapshot, snapshots: [...(itemToSnapshot.snapshots || []), newSnap] };
        setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
        setItemToSnapshot(null);
      }
    } catch (err) {
      alert('Failed to create item snapshot');
    }
  };

  const handleRestoreItem = async (snapshotData) => {
    try {
      const res = await apiFetch(`http://localhost:3000/api/risks/${activeHistoryRisk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...snapshotData.data, _isRestore: true, restoredDate: snapshotData.date })
      });
      if (res.ok) {
        const updatedRisk = await res.json();
        setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
        setActiveHistoryRisk(null);
        if (activeRiskDetails && activeRiskDetails.id === updatedRisk.id) {
          setActiveRiskDetails(updatedRisk);
        }
      }
    } catch (err) {
      alert('Failed to restore item');
    }
  };

  const handleExportCSV = () => {
    const displayRisks = selectedSnapshotId === 'current' ? risks : snapshots.find(s => s.id === parseInt(selectedSnapshotId))?.risks || [];
    
    if (displayRisks.length === 0) {
      alert("No risks to export");
      return;
    }

    const headers = [
      "Risk ID", "Title", "Level", "Category", "Handling Strategy", 
      "Likelihood", "Impact", "Score", "Description", "Impact Statement",
      "Cost Impact", "Schedule Impact", "Performance Impact",
      "Is SPoF", "SPoF Description", "Resource Cost", "Resource Schedule",
      "Plan Realism", "GPOCs", "CPOCs"
    ];

    const rows = displayRisks.map(r => [
      r.userRiskId, r.title, r.level, r.riskCategory, r.handlingStrategy,
      r.likelihood, r.impact, (r.likelihood || 0) * (r.impact || 0),
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.impactStatement || '').replace(/"/g, '""')}"`,
      r.impactCost, r.impactSchedule, r.impactPerformance,
      r.isSpof ? 'Yes' : 'No', `"${(r.spofDescription || '').replace(/"/g, '""')}"`,
      r.resourceCostNeeded, r.resourceScheduleNeeded,
      `"${(r.planRealism || '').replace(/"/g, '""')}"`, r.gpocs, r.cpocs
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `erm_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading ERM Data...</div>;

  const currentSnapshotRisks = selectedSnapshotId === 'current' 
    ? risks 
    : snapshots.find(s => s.id === parseInt(selectedSnapshotId))?.risks || [];

  const displayRisks = currentSnapshotRisks.filter(r => {
    const typeMatch = activeItemType === 'All' ? true : (r.itemType || 'Risk') === activeItemType;
    const levelMatch = activeLevelFilter === 'All' ? true : r.level === activeLevelFilter;
    return typeMatch && levelMatch;
  });

  const comparisonSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <select 
            className="form-input" 
            style={{ padding: '0.25rem 0.5rem', width: 'auto' }}
            value={activeLevelFilter}
            onChange={(e) => setActiveLevelFilter(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="Program">Program</option>
            <option value="Internal">Internal</option>
          </select>
          <select 
            className="form-input" 
            style={{ padding: '0.25rem 0.5rem', width: 'auto' }}
            value={activeItemType}
            onChange={(e) => setActiveItemType(e.target.value)}
          >
            <option value="All">All Items</option>
            <option value="Risk">Risks</option>
            <option value="Issue">Issues</option>
            <option value="Opportunity">Opportunities</option>
          </select>
          <select 
            className="form-input" 
            style={{ padding: '0.25rem 0.5rem', width: 'auto' }}
            value={selectedSnapshotId}
            onChange={(e) => setSelectedSnapshotId(e.target.value)}
          >
            <option value="current">Current State</option>
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>
                {s.note} ({new Date(s.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ padding: '0.5rem', width: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
            value=""
            onChange={(e) => {
              const action = e.target.value;
              if (action === 'new') setShowPasswordModal(true);
              if (action === 'open') window.electron.ipcRenderer.invoke('api-open-file');
              if (action === 'save') window.electron.ipcRenderer.invoke('api-save');
              if (action === 'save-as') window.electron.ipcRenderer.invoke('api-save-as');
              if (action === 'snapshot') setIsGlobalSnapshotModalOpen(true);
              if (action === 'csv') handleExportCSV();
              e.target.value = ''; // Reset selection
            }}
          >
            <option value="" disabled>File Actions...</option>
            <option value="new">New File</option>
            <option value="open">Open File...</option>
            <option value="save">Save</option>
            <option value="save-as">Save As...</option>
            <option value="snapshot">Create Global Snapshot</option>
            <option value="csv">Export to CSV</option>
          </select>
          <button className="btn" onClick={() => setIsModalOpen(true)}>
            <PlusCircle size={18} style={{ marginRight: '8px' }} />
            New RIO
          </button>
        </div>
      </div>

      {selectedSnapshotId !== 'current' && (
        <div style={{ background: 'var(--warning)', color: '#000', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
          Viewing Historical Snapshot. Edits are disabled.
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{activeItemType} Register</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{displayRisks.length} item{displayRisks.length !== 1 ? 's' : ''}</span>
          </div>

          {displayRisks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No items identified yet.
            </div>
          ) : displayRisks.map(risk => {
              const score = (risk.likelihood || 0) * (risk.impact || 0);
              
              // Calculate Delta
              let deltaIcon = null;
              if (selectedSnapshotId === 'current' && comparisonSnapshot) {
                const prevRisk = comparisonSnapshot.risks.find(r => r.id === risk.id);
                if (prevRisk) {
                  const prevScore = (prevRisk.likelihood || 0) * (prevRisk.impact || 0);
                  if (score > prevScore) {
                    deltaIcon = <ArrowUpRight size={16} color="var(--danger)" title={`Up from ${prevScore}`} />;
                  } else if (score < prevScore) {
                    deltaIcon = <ArrowDownRight size={16} color="var(--success)" title={`Down from ${prevScore}`} />;
                  } else {
                    deltaIcon = <Minus size={16} color="var(--text-muted)" title="No change" />;
                  }
                }
              }

              let badgeClass = '';
              const currentItemType = risk.itemType || 'Risk';
              if (currentItemType === 'Opportunity') badgeClass = getOppScoreClass(risk.likelihood || 1, risk.impact || 1);
              else if (currentItemType === 'Issue') badgeClass = getIssueScoreClass(risk.impact || 1);
              else badgeClass = getScoreClass(risk.likelihood || 1, risk.impact || 1);

              return (
                <div key={risk.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    onClick={() => setActiveRiskDetails(risk)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.875rem 1.25rem', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: '4px', flexShrink: 0 }}>
                        {risk.userRiskId}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {risk.title}
                      </span>
                      {risk.level === 'Program' ? (
                        <span style={{ fontSize: '0.7rem', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '12px' }}>PROG</span>
                      ) : risk.level === 'Internal' ? (
                        <span style={{ fontSize: '0.7rem', border: '1px solid var(--success)', color: 'var(--success)', padding: '1px 6px', borderRadius: '12px' }}>INT</span>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      {deltaIcon && <div style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>{deltaIcon}</div>}
                      <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', background: 'var(--border)', whiteSpace: 'nowrap' }}>
                        {currentItemType !== 'Issue' && `L: ${risk.likelihood} | `} I: {risk.impact}
                      </span>
                      <span className={badgeClass} style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', border: 'none' }}>
                        Score: {currentItemType === 'Issue' ? risk.impact : score}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Right Column: Matrix */}
        <div style={{ width: '480px', flexShrink: 0, position: 'sticky', top: '2rem' }}>
          <RiskMatrix risks={displayRisks} activeType={activeItemType} />
        </div>
      </div>

      {activeRiskDetails && (
        <RiskDetailsModal 
          risk={activeRiskDetails} 
          onClose={() => setActiveRiskDetails(null)} 
          onActionClick={(action, targetRisk) => {
            if (action === 'edit') setEditingRisk(targetRisk);
            if (action === 'burndown') setActiveBurndownRisk(targetRisk);
            if (action === 'snapshot') setItemToSnapshot(targetRisk);
            if (action === 'statusLog') setActiveStatusLogRisk(targetRisk);
            if (action === 'attachments') setActiveAttachmentsRisk(targetRisk);
            if (action === 'history') setActiveHistoryRisk(targetRisk);
            
            // Note: We deliberately don't close activeRiskDetails here so it stays open
            // in the background while the sub-modal is open, providing a nice layered feel.
          }}
        />
      )}

      {isModalOpen && (
        <RiskFormModal
          onClose={() => setIsModalOpen(false)}
          onRiskAdded={(newRisk) => setRisks([...risks, newRisk])}
        />
      )}

      {isGlobalSnapshotModalOpen && (
        <SnapshotModal 
          title="Create Global Snapshot"
          onClose={() => setIsGlobalSnapshotModalOpen(false)} 
          onSave={handleCreateGlobalSnapshot} 
        />
      )}

      {itemToSnapshot && (
        <SnapshotModal 
          title={`Snapshot: ${itemToSnapshot.userRiskId}`}
          onClose={() => setItemToSnapshot(null)} 
          onSave={handleCreateItemSnapshot} 
        />
      )}

      {activeHistoryRisk && (
        <ItemHistoryModal
          risk={activeHistoryRisk}
          onClose={() => setActiveHistoryRisk(null)}
          onRestore={handleRestoreItem}
        />
      )}

      {editingRisk && selectedSnapshotId === 'current' && (
        <RiskFormModal
          initialRisk={editingRisk}
          onClose={() => setEditingRisk(null)}
          onRiskUpdated={(updatedRisk) => {
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            if (activeRiskDetails?.id === updatedRisk.id) setActiveRiskDetails(updatedRisk);
            setEditingRisk(null);
          }}
        />
      )}

      {activeBurndownRisk && selectedSnapshotId === 'current' && (
        <BurndownModal
          risk={activeBurndownRisk}
          onClose={() => setActiveBurndownRisk(null)}
          onRiskUpdated={(updatedRisk) => {
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            if (activeRiskDetails?.id === updatedRisk.id) setActiveRiskDetails(updatedRisk);
            setActiveBurndownRisk(updatedRisk);
          }}
        />
      )}

      {activeStatusLogRisk && selectedSnapshotId === 'current' && (
        <StatusLogModal
          risk={activeStatusLogRisk}
          onClose={() => setActiveStatusLogRisk(null)}
          onRiskUpdated={(updatedRisk) => {
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            if (activeRiskDetails?.id === updatedRisk.id) setActiveRiskDetails(updatedRisk);
            setActiveStatusLogRisk(updatedRisk);
          }}
        />
      )}

      {activeAttachmentsRisk && selectedSnapshotId === 'current' && (
        <AttachmentsModal
          risk={activeAttachmentsRisk}
          onClose={() => setActiveAttachmentsRisk(null)}
          onAttachmentAdded={(newAttachment) => {
            const updatedRisk = { ...activeAttachmentsRisk, attachments: [...(activeAttachmentsRisk.attachments || []), newAttachment] };
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            if (activeRiskDetails?.id === updatedRisk.id) setActiveRiskDetails(updatedRisk);
            setActiveAttachmentsRisk(updatedRisk);
          }}
          onAttachmentRemoved={(attachmentId) => {
            const updatedRisk = { ...activeAttachmentsRisk, attachments: activeAttachmentsRisk.attachments.filter(a => a.id !== attachmentId) };
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            if (activeRiskDetails?.id === updatedRisk.id) setActiveRiskDetails(updatedRisk);
            setActiveAttachmentsRisk(updatedRisk);
          }}
        />
      )}

      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Set Admin Password</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Create a password to protect the Admin settings for this new workspace.
            </p>
            <input
              type="password"
              className="form-input"
              style={{ marginBottom: '1.5rem' }}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter password..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="btn" onClick={() => {
                window.electron.ipcRenderer.invoke('api-new-file', newPassword);
                setShowPasswordModal(false);
                setNewPassword('');
              }}>Create Workspace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
