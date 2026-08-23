import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  
  
  
  
  
  
  
  
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  
  
  Search, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Layers,
  X
} from 'lucide-react';
import RiskMatrix, { getScoreClass, getOppScoreClass, getIssueScoreClass } from '../components/RiskMatrix';
import RiskFormModal from '../components/RiskFormModal';
import BurndownModal from '../components/BurndownModal';
import AttachmentsModal from '../components/AttachmentsModal';
import StatusLogModal from '../components/StatusLogModal';
import SnapshotModal from '../components/SnapshotModal';
import ItemHistoryModal from '../components/ItemHistoryModal';
import RiskDetailsModal from '../components/RiskDetailsModal';
import PdfReport from '../components/PdfReport';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../utils/api';

const Dashboard = () => {
  const [risks, setRisks] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('current');
  const [activeItemType, setActiveItemType] = useState('Risk');
  const [activeLevelFilter, setActiveLevelFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
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
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [singlePrintRiskId, setSinglePrintRiskId] = useState(null);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setSinglePrintRiskId(null);
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    
    const handlePrintSingle = (e) => {
      setSinglePrintRiskId(e.detail);
      setTimeout(() => window.print(), 100);
    };
    window.addEventListener('print-single-risk', handlePrintSingle);
    
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('print-single-risk', handlePrintSingle);
    };
  }, []);

  const loadData = async () => {
    try {
      const [resRisks, resSnaps, resFields] = await Promise.all([
        apiFetch('/api/risks'),
        apiFetch('/api/snapshots'),
        apiFetch('/api/fields')
      ]);
      const dataRisks = await resRisks.json();
      const dataSnaps = await resSnaps.json();
      const dataFields = await resFields.json();
      
      setRisks(Array.isArray(dataRisks) ? dataRisks : []);
      setSnapshots(Array.isArray(dataSnaps) ? dataSnaps : []);
      setFields(Array.isArray(dataFields) ? dataFields : []);
    } catch (err) {
      console.error(err);
      setRisks([]);
      setSnapshots([]);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsModalOpen(true);
      }
      
      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.electron.ipcRenderer.invoke('api-save').then(saved => {
          if (saved) toast.success('Workspace saved successfully');
        }).catch(() => toast.error('File operation failed'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateGlobalSnapshot = async (note) => {
    try {
      const res = await apiFetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (!res.ok) throw new Error('Failed to create snapshot');
      const newSnapshot = await res.json();
      setSnapshots([...snapshots, newSnapshot]);
      setIsGlobalSnapshotModalOpen(false);
      toast.success('Global snapshot created');
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const handleCreateItemSnapshot = async (note) => {
    try {
      const res = await apiFetch(`/api/risks/${itemToSnapshot.id}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (!res.ok) throw new Error('Failed to create item snapshot');
      const updatedRisk = await res.json();
      setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
      if (activeRiskDetails?.id === updatedRisk.id) setActiveRiskDetails(updatedRisk);
      setItemToSnapshot(null);
      toast.success('Item snapshot created');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create item snapshot');
    }
  };

  const handleRestoreItem = async (snapshotData) => {
    try {
      const res = await apiFetch(`/api/risks/${activeHistoryRisk.id}`, {
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
      toast.error('Failed to restore item');
    }
  };

  const handleExportCSV = useCallback(() => {
    if (risks.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['ID', 'Type', 'Title', 'Level', 'Category', 'Strategy', 'Likelihood', 'Impact', 'Score', 'GPOCs', 'CPOCs', 'Description'];
    const rows = risks.map(r => [
      r.userRiskId || r.id,
      r.itemType || 'Risk',
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.level || '',
      Array.isArray(r.riskCategory) ? r.riskCategory.join(';') : (r.riskCategory || ''),
      Array.isArray(r.handlingStrategy) ? r.handlingStrategy.join(';') : (r.handlingStrategy || ''),
      r.likelihood || 1,
      r.impact || 1,
      (r.likelihood || 1) * (r.impact || 1),
      `"${(r.gpocs || '').replace(/"/g, '""')}"`,
      `"${(r.cpocs || '').replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/<[^>]+>/g, '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERM_Risk_Register_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [risks]);

  useEffect(() => {
    const handleAppAction = (e) => {
      const action = e.detail;
      if (action === 'snapshot') setIsGlobalSnapshotModalOpen(true);
      if (action === 'csv') handleExportCSV();
      if (action === 'print') window.print();
    };
    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, [risks, snapshots, fields, selectedSnapshotId, handleExportCSV]);

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading ERM Workspace...</div>;

  const currentSnapshotRisks = selectedSnapshotId === 'current' 
    ? risks 
    : snapshots.find(s => s.id === parseInt(selectedSnapshotId))?.risks || [];

  const displayRisks = currentSnapshotRisks.filter(r => {
    const typeMatch = activeItemType === 'All' ? true : (r.itemType || 'Risk') === activeItemType;
    const levelMatch = activeLevelFilter === 'All' ? true : r.level === activeLevelFilter;
    const searchMatch = !searchQuery || 
      (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.userRiskId && r.userRiskId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.gpocs && r.gpocs.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.cpocs && r.cpocs.toLowerCase().includes(searchQuery.toLowerCase()));
    return typeMatch && levelMatch && searchMatch;
  });

  const comparisonSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // KPI Metrics Calculation
  const totalCount = currentSnapshotRisks.length;
  const highRiskCount = currentSnapshotRisks.filter(r => (r.itemType || 'Risk') === 'Risk' && (r.likelihood || 1) * (r.impact || 1) >= 12).length;
  const spofCount = currentSnapshotRisks.filter(r => r.isSpof).length;
  const oppCount = currentSnapshotRisks.filter(r => (r.itemType || 'Risk') === 'Opportunity').length;
  const issueCount = currentSnapshotRisks.filter(r => (r.itemType || 'Risk') === 'Issue').length;

  return (
    <>
      <div className="container no-print">
        
        {/* KPI Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem', marginBottom: '0.85rem' }}>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Items</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{totalCount}</div>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>High / Critical</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: highRiskCount > 0 ? 'var(--danger)' : 'white' }}>{highRiskCount}</div>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FDA4AF' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Single Points (SPoF)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: spofCount > 0 ? '#FDA4AF' : 'white' }}>{spofCount}</div>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Issues</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: issueCount > 0 ? 'var(--warning)' : 'white' }}>{issueCount}</div>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Opportunities</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--info)' }}>{oppCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Left Segmented Type Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.25)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {[
              { id: 'Risk', label: 'Risks', count: risks.filter(r => (r.itemType || 'Risk') === 'Risk').length },
              { id: 'Issue', label: 'Issues', count: risks.filter(r => (r.itemType || 'Risk') === 'Issue').length },
              { id: 'Opportunity', label: 'Opportunities', count: risks.filter(r => (r.itemType || 'Risk') === 'Opportunity').length },
              { id: 'All', label: 'All Items', count: risks.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveItemType(tab.id)}
                className={`filter-chip ${activeItemType === tab.id ? 'active' : ''}`}
                style={{ borderRadius: '6px' }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '9999px', background: activeItemType === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Center/Right Filters & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            
            {/* Quick Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search items, IDs, POCs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '28px', paddingRight: searchQuery ? '24px' : '8px', width: '200px', fontSize: '0.8rem' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <select 
              className="form-input" 
              style={{ padding: '0.35rem 0.6rem', width: 'auto', fontSize: '0.825rem' }}
              value={activeLevelFilter}
              onChange={(e) => setActiveLevelFilter(e.target.value)}
            >
              <option value="All">All Levels</option>
              <option value="Program">Program</option>
              <option value="Internal">Internal</option>
            </select>

            <select 
              className="form-input" 
              style={{ padding: '0.35rem 0.6rem', width: 'auto', fontSize: '0.825rem' }}
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

            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <PlusCircle size={15} />
              New Item
            </button>
          </div>
        </div>

        {selectedSnapshotId !== 'current' && (
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.4rem 0.85rem', borderRadius: '6px', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            Viewing Historical Snapshot ({snapshots.find(s => s.id === parseInt(selectedSnapshotId))?.note}). Live edits are locked.
          </div>
        )}

        {displayRisks.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', borderStyle: 'dashed' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <PlusCircle size={24} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{searchQuery ? 'No matching items found' : 'Workspace item list is empty'}</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto', fontSize: '0.85rem' }}>
              {searchQuery ? `No items matched your search "${searchQuery}". Try clearing filters.` : 'Get started by creating your first Risk, Issue, or Opportunity to begin active project governance.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ marginTop: '0.25rem' }}>
                <PlusCircle size={15} />
                Create First Item
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            {/* Left Column: List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {activeItemType === 'All' ? 'All Governance Items' : `${activeItemType} Register`}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{displayRisks.length} item{displayRisks.length !== 1 ? 's' : ''}</span>
              </div>
              
              {displayRisks.map(risk => {
                const score = (risk.likelihood || 0) * (risk.impact || 0);
                
                // Calculate Delta
                let deltaIcon = null;
                if (selectedSnapshotId === 'current' && comparisonSnapshot) {
                  const prevRisk = comparisonSnapshot.risks.find(r => r.id === risk.id);
                  if (prevRisk) {
                    const prevScore = (prevRisk.likelihood || 0) * (prevRisk.impact || 0);
                    if (score > prevScore) {
                      deltaIcon = <ArrowUpRight size={15} color="var(--danger)" title={`Up from ${prevScore}`} />;
                    } else if (score < prevScore) {
                      deltaIcon = <ArrowDownRight size={15} color="var(--success)" title={`Down from ${prevScore}`} />;
                    } else {
                      deltaIcon = <Minus size={15} color="var(--text-muted)" title="No change" />;
                    }
                  }
                }

                let badgeClass = '';
                const currentItemType = risk.itemType || 'Risk';
                if (currentItemType === 'Opportunity') badgeClass = getOppScoreClass(risk.likelihood || 1, risk.impact || 1);
                else if (currentItemType === 'Issue') badgeClass = getIssueScoreClass(risk.impact || 1);
                else badgeClass = getScoreClass(risk.likelihood || 1, risk.impact || 1);

                return (
                  <div key={risk.id} className="card card-interactive" style={{ padding: 0, overflow: 'hidden' }}>
                    <div
                      onClick={() => setActiveRiskDetails(risk)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.85rem', cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.75rem', padding: '1px 6px', background: 'var(--primary)', color: 'white', borderRadius: '4px', flexShrink: 0, fontWeight: 700, letterSpacing: '0.02em' }}>
                          {risk.userRiskId}
                        </span>
                        
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#FFFFFF', whiteSpace: isPrinting ? 'nowrap' : 'normal', overflowWrap: 'break-word', wordWrap: 'break-word', overflow: isPrinting ? 'hidden' : 'visible', textOverflow: isPrinting ? 'ellipsis' : 'clip', maxWidth: isPrinting ? '350px' : 'none', display: isPrinting ? 'inline-block' : 'inline', verticalAlign: 'middle' }}>
                          {risk.title}
                        </span>

                        {risk.isSpof && (
                          <span className="badge badge-spof" style={{ fontSize: '0.65rem', padding: '0px 5px' }}>SPOF</span>
                        )}

                        {risk.level === 'Program' ? (
                          <span style={{ fontSize: '0.65rem', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0px 5px', borderRadius: '10px', fontWeight: 600 }}>PROG</span>
                        ) : risk.level === 'Internal' ? (
                          <span style={{ fontSize: '0.65rem', border: '1px solid var(--success)', color: 'var(--success)', padding: '0px 5px', borderRadius: '10px', fontWeight: 600 }}>INT</span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                        {deltaIcon && <div style={{ display: 'flex', alignItems: 'center', marginRight: '2px' }}>{deltaIcon}</div>}
                        
                        <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {currentItemType !== 'Issue' && `P:${risk.likelihood} `}C:{risk.impact}
                        </span>
                        
                        <span className={badgeClass} style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', border: 'none' }}>
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
          <div style={{ width: '420px', flexShrink: 0, position: 'sticky', top: '4rem' }}>
            <RiskMatrix risks={displayRisks} activeType={activeItemType} showCounts={true} />
          </div>
          </div>
        )}

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

      </div>

      {/* Hidden during normal use, visible only when printing a single risk */}
      {singlePrintRiskId && (
        <PdfReport 
          risks={displayRisks.filter(r => r.id === singlePrintRiskId)} 
        />
      )}

      {/* Hidden during normal use, visible only when printing the global report */}
      {!singlePrintRiskId && (
        <PdfReport 
          risks={displayRisks} 
        />
      )}
    </>
  );
};

export default Dashboard;
