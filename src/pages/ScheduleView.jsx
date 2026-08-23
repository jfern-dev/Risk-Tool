import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { calculateCriticalPath } from '../utils/cpm';
import { calculateTaskScheduleP80 } from '../utils/mcEngine';
import { formatDate } from '../utils/calendar';

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
  const [targetTaskId, setTargetTaskId] = useState('');
  const [mcIterations, setMcIterations] = useState(1000);
  const [primaryView, setPrimaryView] = useState('risk-adjusted');
  const [filterCritical, setFilterCritical] = useState(false);
  const [hideSummaryTasks, setHideSummaryTasks] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState({});

  // Mapping Modal State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingActiveTaskId, setMappingActiveTaskId] = useState(null);
  const [mappingTempSelection, setMappingTempSelection] = useState([]);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const [scheduleRes, mappingRes, risksRes, settingsRes] = await Promise.all([
        apiFetch('/api/schedule'),
        apiFetch('/api/mapping').catch(() => []),
        apiFetch('/api/risks').catch(() => []),
        apiFetch('/api/dashboardSettings').catch(() => [])
      ]);
      const data = await scheduleRes.json();
      setSchedule(data || { tasks: [], dependencies: [] });

      let mapData = [];
      try { mapData = await mappingRes.json(); } catch (e) { console.error('JSON parse error', e); }
      setMappings(Array.isArray(mapData) ? mapData : []);

      let riskData = [];
      try { riskData = await risksRes.json(); } catch (e) { console.error('JSON parse error', e); }
      setRisks(Array.isArray(riskData) ? riskData : []);

      let settingsData = {};
      try { settingsData = await settingsRes.json(); } catch (e) { console.error('JSON parse error', e); }
      setDashboardSettings(settingsData || {});
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    }
  };

  // Fast O(1) risk lookup map per task
  const taskRiskMap = useMemo(() => {
    const map = new Map();
    const riskLookup = new Map();
    (risks || []).forEach(r => {
      riskLookup.set(String(r.id), r);
      if (r.userRiskId) riskLookup.set(String(r.userRiskId), r);
    });

    (mappings || []).forEach(m => {
      const mappedRisk = riskLookup.get(String(m.riskId));
      if (!mappedRisk) return;

      const uuids = m.taskUuids && Array.isArray(m.taskUuids)
        ? m.taskUuids
        : (m.taskId ? [String(m.taskId)] : []);

      uuids.forEach(uid => {
        if (!uid) return;
        const key = String(uid);
        if (!map.has(key)) map.set(key, []);
        if (!map.get(key).some(r => r.id === mappedRisk.id)) {
          map.get(key).push(mappedRisk);
        }
      });
    });
    return map;
  }, [mappings, risks]);

  const getMappedRisksForTask = useCallback((task) => {
    if (!task) return [];
    const taskUuid = String(task.uuid || task.id);
    const taskId = String(task.id);
    const fromUuid = taskRiskMap.get(taskUuid) || [];
    const fromId = taskRiskMap.get(taskId) || [];
    const combined = [...fromUuid, ...fromId];
    const unique = [];
    const seen = new Set();
    combined.forEach(r => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        unique.push(r);
      }
    });
    return unique;
  }, [taskRiskMap]);

  // Memoized CPM calculation
  const { cpmData, riskCpmData, cpmError } = useMemo(() => {
    if (!schedule || !schedule.tasks || schedule.tasks.length === 0) {
      return { cpmData: null, riskCpmData: null, cpmError: null };
    }

    try {
      const probMap = dashboardSettings?.probabilityMapping || defaultProbMapping;

      const preparedTasks = schedule.tasks.map(t => {
        const mappedRisks = getMappedRisksForTask(t);
        let riskDelay = 0;
        if (mappedRisks.length > 0) {
          riskDelay = calculateTaskScheduleP80(mappedRisks, probMap, mcIterations);
        }
        return {
          ...t,
          riskDuration: (parseFloat(t.duration) || 0) + riskDelay
        };
      });

      let earliestDate = new Date();
      const validDates = preparedTasks.filter(t => t.start).map(t => new Date(t.start)).filter(d => !isNaN(d.getTime()));
      if (validDates.length > 0) {
        earliestDate = new Date(Math.min(...validDates));
      }

      const calSettings = dashboardSettings?.calendar || {};
      const baseResult = calculateCriticalPath(preparedTasks, schedule.dependencies || [], targetTaskId || null, false, earliestDate, calSettings);
      const riskResult = calculateCriticalPath(preparedTasks, schedule.dependencies || [], targetTaskId || null, true, earliestDate, calSettings);

      return {
        cpmData: baseResult.error ? null : baseResult,
        riskCpmData: riskResult.error ? null : riskResult,
        cpmError: baseResult.error || riskResult.error || null
      };
    } catch (err) {
      return { cpmData: null, riskCpmData: null, cpmError: 'Failed to calculate Critical Path.' };
    }
  }, [schedule, targetTaskId, getMappedRisksForTask, dashboardSettings, mcIterations]);

  const toggleCollapse = (taskId) => {
    setCollapsedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const getVisibleTasks = useCallback((tasksArray) => {
    const visible = [];
    let hiddenLevel = null;

    for (const t of (tasksArray || [])) {
      const level = t.outlineLevel ?? 1;
      if (hiddenLevel !== null) {
        if (level > hiddenLevel) {
          continue;
        } else {
          hiddenLevel = null;
        }
      }

      if (hideSummaryTasks && t.isSummary) continue;

      visible.push(t);

      if (t.isSummary && collapsedTasks[t.id]) {
        hiddenLevel = level;
      }
    }
    return visible;
  }, [hideSummaryTasks, collapsedTasks]);

  // Memoized task arrays for Gantt
  const showRiskAsSolid = primaryView === 'risk-adjusted';
  const activeCpmData = showRiskAsSolid ? riskCpmData : cpmData;

  const visibleGanttTasks = useMemo(() => {
    return getVisibleTasks(riskCpmData?.tasks || []);
  }, [riskCpmData, getVisibleTasks]);

  const baseTaskMap = useMemo(() => {
    return new Map((cpmData?.tasks || []).map(t => [String(t.id), t]));
  }, [cpmData]);

  const activeTaskMap = useMemo(() => {
    return new Map((activeCpmData?.tasks || []).map(t => [String(t.id), t]));
  }, [activeCpmData]);

  const displayedGanttTasks = useMemo(() => {
    if (!filterCritical) return visibleGanttTasks;
    return visibleGanttTasks.filter(t => {
      const baseT = baseTaskMap.get(String(t.id)) || t;
      const activeCriticality = showRiskAsSolid ? t.criticality : baseT.criticality;
      return activeCriticality > 0;
    });
  }, [visibleGanttTasks, filterCritical, baseTaskMap, showRiskAsSolid]);

  const ganttTaskIndexMap = useMemo(() => {
    return new Map(displayedGanttTasks.map((t, idx) => [String(t.id), idx]));
  }, [displayedGanttTasks]);

  const handleOpenMappingModal = (taskId) => {
    setMappingActiveTaskId(taskId);
    const targetTask = schedule.tasks.find(t => String(t.id) === String(taskId));
    const mappedRisks = getMappedRisksForTask(targetTask || { id: taskId });
    setMappingTempSelection(mappedRisks.map(r => r.id));
    setIsMappingModalOpen(true);
  };

  const handleToggleRiskSelection = (riskId) => {
    setMappingTempSelection(prev =>
      prev.includes(riskId) ? prev.filter(id => id !== riskId) : [...prev, riskId]
    );
  };

  const handleSaveMapping = async () => {
    try {
      const targetTask = schedule.tasks.find(t => String(t.id) === String(mappingActiveTaskId));
      const taskUuid = String(targetTask?.uuid || mappingActiveTaskId);

      let updatedMappings = [...mappings];

      risks.forEach(r => {
        const isSelected = mappingTempSelection.includes(r.id);
        const mapIdx = updatedMappings.findIndex(m => m.riskId === r.id);

        if (isSelected) {
          if (mapIdx >= 0) {
            const currentUuids = updatedMappings[mapIdx].taskUuids || [];
            if (!currentUuids.includes(taskUuid)) {
              updatedMappings[mapIdx] = { ...updatedMappings[mapIdx], riskId: r.id, taskUuids: [...currentUuids, taskUuid] };
            }
          } else {
            updatedMappings.push({ riskId: r.id, taskUuids: [taskUuid] });
          }
        } else {
          if (mapIdx >= 0) {
            const currentUuids = updatedMappings[mapIdx].taskUuids || [];
            const filtered = currentUuids.filter(u => u !== taskUuid && u !== String(mappingActiveTaskId));
            if (filtered.length > 0) {
              updatedMappings[mapIdx] = { ...updatedMappings[mapIdx], riskId: r.id, taskUuids: filtered };
            } else {
              updatedMappings.splice(mapIdx, 1);
            }
          }
        }
      });

      const res = await apiFetch('/api/mapping', {
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
        }
      } catch (err) {
        console.error('Import failed', err);
      }
    }
  };

  return (
    <div className="container dashboard-ui">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.35rem', color: 'var(--primary)' }}>Project Schedule</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Import MS Project files to analyze Critical Path and perform schedule risk analysis.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleImport}>Import .mpp File</button>
        </div>
      </div>

      {/* Options Row */}
      {schedule?.tasks?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', background: 'var(--surface-hover)', padding: '8px 12px', borderRadius: '6px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.825rem', color: 'white' }}>Target:</label>
            <select
              value={targetTaskId}
              onChange={(e) => setTargetTaskId(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', minWidth: '160px', color: 'white', fontSize: '0.825rem' }}
            >
              <option value="">-- Project End (Default) --</option>
              {schedule.tasks.map(t => (
                <option key={t.id} value={t.id}>{t.id}: {t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.825rem', color: 'white' }}>MC Iterations:</label>
            <select
              value={mcIterations}
              onChange={(e) => setMcIterations(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'white', fontSize: '0.825rem' }}
            >
              <option value={1000}>1,000</option>
              <option value={2000}>2,000</option>
              <option value={5000}>5,000</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.825rem', color: 'white' }}>View:</label>
            <select
              value={primaryView}
              onChange={(e) => setPrimaryView(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'white', fontSize: '0.825rem' }}
            >
              <option value="risk-adjusted">Risk-Adjusted (Solid)</option>
              <option value="original">Original Schedule (Solid)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.825rem' }}>
              <input
                type="checkbox"
                checked={filterCritical}
                onChange={(e) => setFilterCritical(e.target.checked)}
                style={{ width: '14px', height: '14px' }}
              />
              Critical Path Only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.825rem' }}>
              <input
                type="checkbox"
                checked={hideSummaryTasks}
                onChange={(e) => setHideSummaryTasks(e.target.checked)}
                style={{ width: '14px', height: '14px' }}
              />
              Hide Summaries
            </label>
          </div>
        </div>
      )}

      <div className="tabs" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
        <button
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'data' ? '2px solid var(--primary)' : 'none', color: activeTab === 'data' ? 'var(--primary)' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
        >
          Data View (Tasks & Links)
        </button>
        <button
          className={`tab-btn ${activeTab === 'gantt' ? 'active' : ''}`}
          onClick={() => setActiveTab('gantt')}
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'gantt' ? '2px solid var(--primary)' : 'none', color: activeTab === 'gantt' ? 'var(--primary)' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
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

      {cpmError && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error:</strong> {cpmError}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="card">
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Tasks ({schedule?.tasks?.length || 0})</h3>
                <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '4px 8px' }}>ID</th>
                        <th style={{ padding: '4px 8px' }}>Name</th>
                        <th style={{ padding: '4px 8px' }}>Duration</th>
                        <th style={{ padding: '4px 8px' }}>Start</th>
                        <th style={{ padding: '4px 8px' }}>Predecessors</th>
                        <th style={{ padding: '4px 8px' }}>Mapped Risks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getVisibleTasks(schedule?.tasks).map(t => {
                        const mappedRisks = getMappedRisksForTask(t);
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '4px 8px' }}>{t.id}</td>
                            <td style={{ padding: '4px 8px', paddingLeft: `${(t.outlineLevel ?? 1) * 12}px`, fontWeight: t.isSummary ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {t.isSummary && (
                                <button
                                  onClick={() => toggleCollapse(t.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '14px', color: 'inherit' }}
                                >
                                  {collapsedTasks[t.id] ? '▶' : '▼'}
                                </button>
                              )}
                              {!t.isSummary && <span style={{ width: '14px' }}></span>}
                              {t.name}
                            </td>
                            <td style={{ padding: '4px 8px' }}>{t.duration} d</td>
                            <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{t.start ? new Date(t.start).toLocaleDateString() : 'N/A'}</td>
                            <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>
                              {(schedule?.dependencies || [])
                                .filter(d => String(d.target) === String(t.id))
                                .map(d => `${d.source} (${d.type})`)
                                .join(', ') || '-'}
                            </td>
                            <td style={{ padding: '4px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                  {mappedRisks.length === 0 ? (
                                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                                  ) : (
                                    mappedRisks.map(risk => (
                                      <span key={risk.id} style={{ background: 'var(--surface-hover)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.75rem', border: '1px solid var(--border)' }} title={risk.title || 'Unknown Risk'}>
                                        {risk.userRiskId || risk.id}
                                      </span>
                                    ))
                                  )}
                                </div>
                                <button
                                  onClick={() => handleOpenMappingModal(t.id)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px', textDecoration: 'underline', fontSize: '0.8rem' }}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
                      <div style={{ position: 'absolute', left: '0%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(riskCpmData.projectStartDate)}</div>
                      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(new Date((riskCpmData.projectStartDate.getTime() + riskCpmData.projectFinishDate.getTime()) / 2))}</div>
                      <div style={{ position: 'absolute', right: '0%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(riskCpmData.projectFinishDate)}</div>
                    </div>
                  </div>

                  {/* SVG Lines for dependencies (Overlays the flexGrow area) */}
                  <div style={{ position: 'absolute', top: '40px', left: '250px', right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
                    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {(schedule?.dependencies || []).map((d, i) => {
                        const sTask = activeTaskMap.get(String(d.source));
                        const tTask = activeTaskMap.get(String(d.target));
                        if (!sTask || !tTask) return null;

                        const sIndex = ganttTaskIndexMap.get(String(d.source));
                        const tIndex = ganttTaskIndexMap.get(String(d.target));

                        if (sIndex === undefined || tIndex === undefined) return null;

                        let pathLevel = null;
                        if (sTask.criticality === 1 && tTask.criticality === 1 && sTask.earlyFinish === tTask.earlyStart) pathLevel = 1;
                        else if (sTask.criticality === 2 && tTask.criticality === 2 && sTask.earlyFinish === tTask.earlyStart) pathLevel = 2;
                        else if (sTask.criticality === 3 && tTask.criticality === 3 && sTask.earlyFinish === tTask.earlyStart) pathLevel = 3;

                        const x1 = (sTask.earlyFinish / (riskCpmData.projectDuration || 1)) * 100;
                        const y1 = (sIndex * 40) + 16;

                        const x2 = (tTask.earlyStart / (riskCpmData.projectDuration || 1)) * 100;
                        const y2 = (tIndex * 40) + 16;

                        const strokeColor = pathLevel === 1 ? 'var(--danger)' :
                          pathLevel === 2 ? '#f97316' :
                          pathLevel === 3 ? '#eab308' :
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
                    {displayedGanttTasks.map((t) => {
                      const baseT = baseTaskMap.get(String(t.id)) || t;

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

                      const activeCriticality = showRiskAsSolid ? t.criticality : baseT.criticality;

                      const textColor = activeCriticality === 1 ? '#991b1b' :
                        activeCriticality === 2 ? '#c2410c' :
                        activeCriticality === 3 ? '#a16207' :
                        'var(--text)';

                      const fontWeight = activeCriticality ? 600 : 400;
                      const riskDelay = (t.riskDuration !== undefined) ? (t.riskDuration - t.originalDuration) : 0;

                      const solidBarStyle = {
                        height: '16px',
                        top: '8px',
                        borderRadius: '4px',
                        opacity: 0.85,
                        pointerEvents: 'auto',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      };

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
                          <div style={{ width: '250px', flexShrink: 0, paddingLeft: `${8 + (t.outlineLevel ?? 1) * 12}px`, paddingRight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: textColor, fontWeight: t.isSummary ? 'bold' : fontWeight, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {t.isSummary && (
                              <button
                                onClick={() => toggleCollapse(t.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '16px', color: 'inherit' }}
                              >
                                {collapsedTasks[t.id] ? '▶' : '▼'}
                              </button>
                            )}
                            {!t.isSummary && <span style={{ width: '16px' }}></span>}
                            <span>{t.id}: {t.name}</span>
                          </div>
                          <div style={{ flexGrow: 1, position: 'relative', height: '100%', borderLeft: '1px solid var(--border)' }}>
                            {/* Grid lines */}
                            <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border)', opacity: 0.5 }} />
                            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border)', opacity: 0.5 }} />
                            <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border)', opacity: 0.5 }} />

                            {/* Original Schedule Bar */}
                            <div
                              title={`Original Start: ${formatDate(baseT.earlyStartDate)} (Day ${Math.round(baseT.earlyStart)})\nOriginal Duration: ${Math.round(baseT.duration)}d\nOriginal Finish: ${formatDate(baseT.earlyFinishDate)}`}
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
                              title={`Risk-Adjusted Start: ${formatDate(t.earlyStartDate)} (Day ${Math.round(t.earlyStart)})\nRisk-Adjusted Finish: ${formatDate(t.earlyFinishDate)}\nOriginal Duration: ${Math.round(t.originalDuration)}d\nRisk P80 Delay: +${Math.round(riskDelay)}d\nTotal Risk Duration: ${Math.round(t.duration)}d`}
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
                          <td style={{ padding: '8px' }}>{formatDate(t.earlyStartDate)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(t.earlyFinishDate)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(t.lateStartDate)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(t.lateFinishDate)}</td>
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
          <div className="card" style={{ width: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Map Risks to Task {mappingActiveTaskId}</h3>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.85rem' }} onClick={() => setIsMappingModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }} onClick={handleSaveMapping}>Save</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flexGrow: 1, borderTop: '1px solid var(--border)', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}>
              {risks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No risks found in the Risk Register.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {risks.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '6px 8px', background: 'var(--surface-hover)', borderRadius: '4px' }}>
                      <input
                        type="checkbox"
                        checked={mappingTempSelection.includes(r.id)}
                        onChange={() => handleToggleRiskSelection(r.id)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.userRiskId || r.id}: {r.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description || 'No description'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
