import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { calculateCriticalPath } from '../utils/cpm';
import { calculateTaskScheduleP80 } from '../utils/mcEngine';

const defaultProbMapping = {
  1: { min: 1, max: 20 },
  2: { min: 21, max: 40 },
  3: { min: 41, max: 60 },
  4: { min: 61, max: 80 },
  5: { min: 81, max: 99 }
};

const ScheduleView = () => {
  const [schedule, setSchedule] = useState({ tasks: [], dependencies: [] });
  const [risks, setRisks] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [dashboardSettings, setDashboardSettings] = useState({});
  const [activeTab, setActiveTab] = useState('data');
  const [cpmData, setCpmData] = useState(null);
  const [riskCpmData, setRiskCpmData] = useState(null);
  const [targetTaskId, setTargetTaskId] = useState('');
  const [mcIterations, setMcIterations] = useState(1000);
  const [primaryView, setPrimaryView] = useState('risk-adjusted');
  const [error, setError] = useState(null);
  
  // Mapping Modal State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingActiveTaskId, setMappingActiveTaskId] = useState(null);
  const [mappingTempSelection, setMappingTempSelection] = useState([]);

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    if (schedule && schedule.tasks && schedule.tasks.length > 0) {
      try {
        // Prepare tasks with risk-adjusted durations
        const probMap = dashboardSettings?.probabilityMapping || defaultProbMapping;
        
        const preparedTasks = schedule.tasks.map(t => {
          const mapping = mappings.find(m => m.taskId === t.id);
          let riskDelay = 0;
          if (mapping && mapping.riskIds && mapping.riskIds.length > 0) {
            const mappedRisks = mapping.riskIds.map(rid => risks.find(r => r.id === rid)).filter(Boolean);
            riskDelay = calculateTaskScheduleP80(mappedRisks, probMap, mcIterations);
          }
          return {
            ...t,
            riskDuration: (parseFloat(t.duration) || 0) + riskDelay
          };
        });

        const baseResult = calculateCriticalPath(preparedTasks, schedule.dependencies || [], targetTaskId || null, false);
        const riskResult = calculateCriticalPath(preparedTasks, schedule.dependencies || [], targetTaskId || null, true);
        
        if (baseResult.error) {
          setError(baseResult.error);
        } else {
          setCpmData(baseResult);
          setRiskCpmData(riskResult);
          setError(null);
        }
      } catch (err) {
        setError('Failed to calculate Critical Path.');
      }
    }
  }, [schedule, targetTaskId, mappings, risks, dashboardSettings, mcIterations]);

  const loadSchedule = async () => {
    try {
      const [scheduleRes, mappingRes, risksRes, settingsRes] = await Promise.all([
        apiFetch('http://localhost:3000/api/schedule'),
        apiFetch('http://localhost:3000/api/mapping').catch(() => []),
        apiFetch('http://localhost:3000/api/risks').catch(() => []),
        apiFetch('http://localhost:3000/api/dashboardSettings').catch(() => [])
      ]);
      const data = await scheduleRes.json();
      setSchedule(data || { tasks: [], dependencies: [] });
      
      let mapData = [];
      try { mapData = await mappingRes.json(); } catch(e) {}
      setMappings(Array.isArray(mapData) ? mapData : []);
      
      let riskData = [];
      try { riskData = await risksRes.json(); } catch(e) {}
      setRisks(Array.isArray(riskData) ? riskData : []);
      
      let settingsData = {};
      try { settingsData = await settingsRes.json(); } catch(e) {}
      setDashboardSettings(settingsData || {});
      
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    }
  };

  const handleOpenMappingModal = (taskId) => {
    setMappingActiveTaskId(taskId);
    // Find existing mapping for this task, if any
    const existing = mappings.find(m => m.taskId === taskId);
    setMappingTempSelection(existing && Array.isArray(existing.riskIds) ? existing.riskIds : []);
    setIsMappingModalOpen(true);
  };
  
  const handleToggleRiskSelection = (riskId) => {
    setMappingTempSelection(prev => 
      prev.includes(riskId) ? prev.filter(id => id !== riskId) : [...prev, riskId]
    );
  };
  
  const handleSaveMapping = async () => {
    try {
      // Deep copy to avoid mutating React state
      const updatedMappings = mappings.map(m => ({ ...m, riskIds: [...m.riskIds] }));
      const existingIdx = updatedMappings.findIndex(m => m.taskId === mappingActiveTaskId);
      
      if (existingIdx >= 0) {
        updatedMappings[existingIdx] = { ...updatedMappings[existingIdx], riskIds: [...mappingTempSelection] };
      } else {
        updatedMappings.push({ taskId: mappingActiveTaskId, riskIds: [...mappingTempSelection] });
      }
      
      // Save to backend
      const res = await apiFetch('http://localhost:3000/api/mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMappings)
      });
      
      if (!res.ok) throw new Error('Failed to save mapping');
      
      setMappings(updatedMappings);
      setIsMappingModalOpen(false);
      setMappingActiveTaskId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImport = async () => {
    if (window.electron) {
      try {
        const newSchedule = await window.electron.ipcRenderer.invoke('api-import-mpp');
        if (newSchedule) {
          setSchedule(newSchedule);
          // CPM is recalculated automatically by the useEffect when schedule changes
        }
      } catch (err) {
        console.error('Import failed', err);
      }
    }
  };

  return (
    <div className="container dashboard-ui">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Project Schedule</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Import MS Project files to analyze Critical Path and perform schedule risk analysis.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleImport}>Import .mpp File</button>
        </div>
      </div>

      {/* Options Row */}
      {schedule?.tasks?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: 600, color: 'white' }}>Calculate Critical Path towards:</label>
            <select 
              value={targetTaskId} 
              onChange={(e) => setTargetTaskId(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', minWidth: '200px', color: 'white' }}
            >
              <option value="">-- Project End (Default) --</option>
              {schedule.tasks.map(t => (
                <option key={t.id} value={t.id}>{t.id}: {t.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: 600, color: 'white' }}>Monte Carlo Iterations:</label>
            <select 
              value={mcIterations} 
              onChange={(e) => setMcIterations(Number(e.target.value))}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'white' }}
            >
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: 600, color: 'white' }}>Primary Gantt View:</label>
            <select 
              value={primaryView} 
              onChange={(e) => setPrimaryView(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'white' }}
            >
              <option value="risk-adjusted">Risk-Adjusted (Solid)</option>
              <option value="original">Original Schedule (Solid)</option>
            </select>
          </div>
        </div>
      )}

      <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'data' ? '2px solid var(--primary)' : 'none', color: activeTab === 'data' ? 'var(--primary)' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
        >
          Data View (Tasks & Links)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'gantt' ? 'active' : ''}`}
          onClick={() => setActiveTab('gantt')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'gantt' ? '2px solid var(--primary)' : 'none', color: activeTab === 'gantt' ? 'var(--primary)' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
        >
          Gantt Chart
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'analysis' ? '2px solid var(--primary)' : 'none', color: activeTab === 'analysis' ? 'var(--primary)' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
        >
          Critical Path Analysis
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!schedule?.tasks || schedule.tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ color: 'var(--text-muted)' }}>No Schedule Data</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Upload an MS Project (.mpp) file to get started.</p>
          <button className="btn btn-primary" onClick={handleImport}>Import .mpp</button>
        </div>
      ) : (
        <>
          {activeTab === 'data' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Tasks ({schedule?.tasks?.length || 0})</h3>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>ID</th>
                        <th style={{ padding: '8px' }}>Name</th>
                        <th style={{ padding: '8px' }}>Duration</th>
                        <th style={{ padding: '8px' }}>Start</th>
                        <th style={{ padding: '8px' }}>Predecessors</th>
                        <th style={{ padding: '8px' }}>Mapped Risks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(schedule?.tasks || []).map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px' }}>{t.id}</td>
                          <td style={{ padding: '8px' }}>{t.name}</td>
                          <td style={{ padding: '8px' }}>{t.duration} d</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{t.start ? new Date(t.start).toLocaleDateString() : 'N/A'}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                            {(schedule?.dependencies || [])
                              .filter(d => d.target === t.id)
                              .map(d => `${d.source} (${d.type})`)
                              .join(', ') || '-'}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {(() => {
                                  const mapping = mappings.find(m => m.taskId === t.id);
                                  const mappedRisks = mapping?.riskIds || [];
                                  if (mappedRisks.length === 0) return <span style={{ color: 'var(--text-muted)' }}>None</span>;
                                  return mappedRisks.map(rid => {
                                    const risk = risks.find(r => r.id === rid);
                                    return (
                                      <span key={rid} style={{ background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid var(--border)' }} title={risk?.title || 'Unknown Risk'}>
                                        {rid}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                              <button 
                                onClick={() => handleOpenMappingModal(t.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', textDecoration: 'underline', fontSize: '0.85rem' }}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gantt' && riskCpmData && cpmData && (
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Gantt Chart</h3>
              <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
                <div style={{ minWidth: '800px', position: 'relative' }}>
                  
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', paddingBottom: '8px', marginBottom: '8px', position: 'relative', height: '24px' }}>
                    <div style={{ width: '250px', flexShrink: 0, fontWeight: 600, paddingLeft: '8px' }}>Task Name</div>
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '0%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Day 0</div>
                      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Day {Math.round(riskCpmData.projectDuration / 2)}</div>
                      <div style={{ position: 'absolute', right: '0%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Day {Math.round(riskCpmData.projectDuration)}</div>
                    </div>
                  </div>
                  
                  {/* SVG Lines for dependencies (Overlays the flexGrow area) */}
                  <div style={{ position: 'absolute', top: '40px', left: '250px', right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
                    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {(schedule?.dependencies || []).map((d, i) => {
                        const activeCpmData = (primaryView === 'risk-adjusted') ? riskCpmData : cpmData;
                        const sTask = activeCpmData.tasks.find(t => t.id === d.source);
                        const tTask = activeCpmData.tasks.find(t => t.id === d.target);
                        if (!sTask || !tTask) return null;
                        
                        const sIndex = activeCpmData.tasks.findIndex(t => t.id === d.source);
                        const tIndex = activeCpmData.tasks.findIndex(t => t.id === d.target);
                        
                        let pathLevel = null;
                        if (sTask.criticality === 1 && tTask.criticality === 1 && sTask.earlyFinish === tTask.earlyStart) pathLevel = 1;
                        else if (sTask.criticality === 2 && tTask.criticality === 2 && sTask.earlyFinish === tTask.earlyStart) pathLevel = 2;
                        else if (sTask.criticality === 3 && tTask.criticality === 3 && sTask.earlyFinish === tTask.earlyStart) pathLevel = 3;
                        
                        // Right edge of predecessor
                        const x1 = (sTask.earlyFinish / (riskCpmData.projectDuration || 1)) * 100;
                        const y1 = (sIndex * 40) + 16;
                        
                        // Left edge of successor
                        const x2 = (tTask.earlyStart / (riskCpmData.projectDuration || 1)) * 100;
                        const y2 = (tIndex * 40) + 16;
                        
                        const strokeColor = pathLevel === 1 ? 'var(--danger)' : 
                                            pathLevel === 2 ? '#f97316' : // orange
                                            pathLevel === 3 ? '#eab308' : // yellow
                                            '#cbd5e1';
                        
                        return (
                          <line 
                            key={`dep-${i}`} 
                            x1={`${x1}%`} y1={y1} 
                            x2={`${x2}%`} y2={y2} 
                            stroke={strokeColor} 
                            strokeWidth={pathLevel ? 2 : 1}
                            opacity={pathLevel ? 1 : 0.6}
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* Task Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 2 }}>
                    {riskCpmData.tasks.map((t, index) => {
                      const baseT = cpmData.tasks.find(x => x.id === t.id) || t;
                      
                      const riskLeftPct = (t.earlyStart / (riskCpmData.projectDuration || 1)) * 100;
                      const riskWidthPct = (t.duration / (riskCpmData.projectDuration || 1)) * 100;
                      
                      const baseLeftPct = (baseT.earlyStart / (riskCpmData.projectDuration || 1)) * 100;
                      const baseWidthPct = (baseT.duration / (riskCpmData.projectDuration || 1)) * 100;
                      
                      const barColor = t.criticality === 1 ? 'var(--danger)' :
                                       t.criticality === 2 ? '#f97316' : 
                                       t.criticality === 3 ? '#eab308' : 
                                       'var(--primary)';
                      
                      const baseBarColor = baseT.criticality === 1 ? 'var(--danger)' :
                                           baseT.criticality === 2 ? '#f97316' : 
                                           baseT.criticality === 3 ? '#eab308' : 
                                           'var(--primary)';
                      
                      const showRiskAsSolid = primaryView === 'risk-adjusted';
                      const activeCriticality = showRiskAsSolid ? t.criticality : baseT.criticality;
                      
                      const textColor = activeCriticality === 1 ? '#991b1b' :
                                        activeCriticality === 2 ? '#c2410c' : 
                                        activeCriticality === 3 ? '#a16207' : 
                                        'var(--text)';
                                        
                      const fontWeight = activeCriticality ? 600 : 400;
                      const riskDelay = (t.riskDuration !== undefined) ? (t.riskDuration - t.originalDuration) : 0;
                      
                      // Solid Bar Style
                      const solidBarStyle = {
                        height: '16px', 
                        top: '8px',
                        borderRadius: '4px',
                        opacity: 0.85,
                        pointerEvents: 'auto',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      };
                      
                      // Ghost Bar Style
                      const ghostBarStyle = {
                        height: '24px', 
                        top: '4px',
                        border: '1px dashed var(--text-muted)',
                        borderRadius: '4px',
                        pointerEvents: 'auto',
                        background: 'transparent'
                      };
                      
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', height: '32px', borderRadius: '4px' }}>
                          <div style={{ width: '250px', flexShrink: 0, paddingLeft: '8px', paddingRight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: textColor, fontWeight: fontWeight }}>
                            {t.id}: {t.name}
                          </div>
                          <div style={{ flexGrow: 1, position: 'relative', height: '100%', borderLeft: '1px solid var(--border)' }}>
                            {/* Grid lines */}
                            <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border)', opacity: 0.5 }} />
                            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border)', opacity: 0.5 }} />
                            <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border)', opacity: 0.5 }} />
                            
                            {/* Original Schedule Bar */}
                            <div 
                              title={`Original Start: Day ${Math.round(baseT.earlyStart)}, Original Duration: ${Math.round(baseT.duration)}d`}
                              style={{ 
                                position: 'absolute', 
                                left: `${baseLeftPct}%`, 
                                width: `${Math.max(baseWidthPct, 0.5)}%`, 
                                ...(!showRiskAsSolid ? { ...solidBarStyle, background: baseBarColor } : ghostBarStyle),
                                zIndex: !showRiskAsSolid ? 2 : 1
                              }} 
                            />
                            {/* Risk Adjusted Bar */}
                            <div 
                              title={`Risk-Adjusted Start: Day ${Math.round(t.earlyStart)}\nOriginal Duration: ${Math.round(t.originalDuration)}d\nRisk P80 Delay: +${Math.round(riskDelay)}d\nTotal Risk Duration: ${Math.round(t.duration)}d`}
                              style={{ 
                                position: 'absolute', 
                                left: `${riskLeftPct}%`, 
                                width: `${Math.max(riskWidthPct, 0.5)}%`, 
                                ...(showRiskAsSolid ? { ...solidBarStyle, background: barColor } : ghostBarStyle),
                                zIndex: showRiskAsSolid ? 2 : 1
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && cpmData && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Critical Path Method (CPM)</h3>
                <span style={{ padding: '4px 12px', background: 'var(--surface-hover)', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 600 }}>
                  Est. Duration: <span style={{ color: 'var(--primary)' }}>{cpmData.projectDuration} days</span>
                </span>
              </div>
              
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', background: 'var(--surface-hover)' }}>
                      <th style={{ padding: '12px 8px' }}>Task</th>
                      <th style={{ padding: '12px 8px' }}>Dur.</th>
                      <th style={{ padding: '12px 8px' }}>ES</th>
                      <th style={{ padding: '12px 8px' }}>EF</th>
                      <th style={{ padding: '12px 8px' }}>LS</th>
                      <th style={{ padding: '12px 8px' }}>LF</th>
                      <th style={{ padding: '12px 8px' }}>Total Float</th>
                      <th style={{ padding: '12px 8px' }}>Critical?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpmData.tasks.map(t => {
                      const isCritical = t.isCritical;
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', background: isCritical ? '#fef2f2' : 'transparent' }}>
                          <td style={{ padding: '8px', fontWeight: isCritical ? 600 : 400, color: isCritical ? '#991b1b' : 'inherit' }}>
                            {t.id}: {t.name}
                          </td>
                          <td style={{ padding: '8px' }}>{t.duration}</td>
                          <td style={{ padding: '8px' }}>{t.earlyStart}</td>
                          <td style={{ padding: '8px' }}>{t.earlyFinish}</td>
                          <td style={{ padding: '8px' }}>{t.lateStart}</td>
                          <td style={{ padding: '8px' }}>{t.lateFinish}</td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{t.totalFloat}</td>
                          <td style={{ padding: '8px' }}>
                            {isCritical ? (
                              <span style={{ color: '#dc2626', fontWeight: 800 }}>✓ YES</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mapping Modal */}
      {isMappingModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginTop: 0 }}>Map Risks to Task {mappingActiveTaskId}</h2>
            <div style={{ overflowY: 'auto', flexGrow: 1, marginBottom: '1.5rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', paddingTop: '1rem', paddingBottom: '1rem' }}>
              {risks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No risks found in the Risk Register.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {risks.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px', background: 'var(--surface-hover)', borderRadius: '4px' }}>
                      <input 
                        type="checkbox" 
                        checked={mappingTempSelection.includes(r.id)}
                        onChange={() => handleToggleRiskSelection(r.id)}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.id}: {r.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.description || 'No description'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsMappingModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveMapping}>Save Mapping</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
