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
import { apiFetch } from '../utils/api';

const Dashboard = () => {
  const [risks, setRisks] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('current');
  const [activeItemType, setActiveItemType] = useState('Risk');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBurndownRisk, setActiveBurndownRisk] = useState(null);
  const [activeAttachmentsRisk, setActiveAttachmentsRisk] = useState(null);
  const [activeStatusLogRisk, setActiveStatusLogRisk] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [itemToSnapshot, setItemToSnapshot] = useState(null);
  const [activeHistoryRisk, setActiveHistoryRisk] = useState(null);
  const [isGlobalSnapshotModalOpen, setIsGlobalSnapshotModalOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
      "Plan Realism", "SEMP 7", "SEMP 8", "GPOCs", "CPOCs"
    ];

    const rows = displayRisks.map(r => [
      r.userRiskId, r.title, r.level, r.riskCategory, r.handlingStrategy,
      r.likelihood, r.impact, (r.likelihood || 0) * (r.impact || 0),
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.impactStatement || '').replace(/"/g, '""')}"`,
      r.impactCost, r.impactSchedule, r.impactPerformance,
      r.isSpof ? 'Yes' : 'No', `"${(r.spofDescription || '').replace(/"/g, '""')}"`,
      r.resourceCostNeeded, r.resourceScheduleNeeded,
      `"${(r.planRealism || '').replace(/"/g, '""')}"`,
      r.sempTable7, r.sempTable8, r.gpocs, r.cpocs
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

  const displayRisks = currentSnapshotRisks.filter(r => 
    activeItemType === 'All' ? true : (r.itemType || 'Risk') === activeItemType
  );

  const comparisonSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
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
              if (action === 'new') window.electron.ipcRenderer.invoke('api-new-file');
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
            New Risk
          </button>
        </div>
      </div>

      {selectedSnapshotId !== 'current' && (
        <div style={{ background: 'var(--warning)', color: '#000', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
          Viewing Historical Snapshot. Edits are disabled.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          <RiskMatrix risks={displayRisks} activeType={activeItemType} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{activeItemType} Register</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{displayRisks.length} item{displayRisks.length !== 1 ? 's' : ''}</span>
          </div>

          {displayRisks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No items identified yet.
            </div>
          ) : (
            displayRisks.map(risk => {
              const isExpanded = expandedIds.has(risk.id);
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
                    onClick={() => toggleExpand(risk.id)}
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
                      <ChevronDown size={18} color="var(--text-muted)" style={{ transition: 'transform 0.25s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                        <div><strong>Category:</strong> {risk.riskCategory || 'N/A'}</div>
                        <div><strong>Strategy:</strong> {risk.handlingStrategy || 'N/A'}</div>
                        <div><strong>GPOCs:</strong> {risk.gpocs || 'None'}</div>
                      </div>
                      
                      {risk.description && (
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>Description:</strong>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{risk.description}</p>
                        </div>
                      )}
                      
                      {risk.isSpof && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                          <strong style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Single Point of Failure (SPoF)</strong>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{risk.spofDescription}</p>
                        </div>
                      )}

                      <RiskTimeline risk={risk} />
                      
                      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={(e) => { e.stopPropagation(); setEditingRisk(risk); }}>
                          <Pencil size={16} style={{ marginRight: '6px' }} />
                          Edit
                        </button>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={(e) => { e.stopPropagation(); setActiveBurndownRisk(risk); }}>
                          <TrendingDown size={16} style={{ marginRight: '6px' }} />
                          Action Plan ({risk.burndownSteps?.length || 0})
                        </button>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={(e) => { e.stopPropagation(); setItemToSnapshot(risk); }}>
                          <Camera size={16} style={{ marginRight: '6px' }} />
                          Snapshot
                        </button>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={(e) => { e.stopPropagation(); setActiveStatusLogRisk(risk); }}>
                          <Clock size={16} style={{ marginRight: '6px' }} />
                          Status Logs ({risk.statusLogs?.length || 0})
                        </button>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={(e) => { e.stopPropagation(); setActiveAttachmentsRisk(risk); }}>
                          <FileText size={16} style={{ marginRight: '6px' }} />
                          Attachments ({risk.attachments?.length || 0})
                        </button>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={(e) => { e.stopPropagation(); setActiveHistoryRisk(risk); }}>
                          <Clock size={16} style={{ marginRight: '6px' }} />
                          History ({risk.snapshots?.length || 0})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

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
        />
      )}

      {editingRisk && selectedSnapshotId === 'current' && (
        <RiskFormModal
          initialRisk={editingRisk}
          onClose={() => setEditingRisk(null)}
          onRiskUpdated={(updatedRisk) => {
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
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
            setActiveAttachmentsRisk(updatedRisk);
          }}
          onAttachmentRemoved={(attachmentId) => {
            const updatedRisk = { ...activeAttachmentsRisk, attachments: activeAttachmentsRisk.attachments.filter(a => a.id !== attachmentId) };
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            setActiveAttachmentsRisk(updatedRisk);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
