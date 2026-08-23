import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { apiFetch } from '../utils/api';

const RiskFormModal = ({ onClose, onRiskAdded, initialRisk, onRiskUpdated, readOnly = false, customHeader = null }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [dashboardSettings, setDashboardSettings] = useState(null);

  // Tab 1: General
  const [itemType, setItemType] = useState(initialRisk?.itemType || 'Risk');
  const [userRiskId, setUserRiskId] = useState(initialRisk?.userRiskId || '');
  const [title, setTitle] = useState(initialRisk?.title || '');
  const [level, setLevel] = useState(initialRisk?.level || 'Program');
  const [riskCategory, setRiskCategory] = useState(initialRisk?.riskCategory || ['Technical']);
  const [handlingStrategy, setHandlingStrategy] = useState(initialRisk?.handlingStrategy || 'Mitigate/Execute');
  const [gpocs, setGpocs] = useState(initialRisk?.gpocs || '');
  const [cpocs, setCpocs] = useState(initialRisk?.cpocs || '');

  const [discoveredDate, setDiscoveredDate] = useState(initialRisk?.discoveredDate || '');
  const [approvedDate, setApprovedDate] = useState(initialRisk?.approvedDate || '');
  const [closedDate, setClosedDate] = useState(initialRisk?.closedDate || '');
  const [closureCriteria, setClosureCriteria] = useState(initialRisk?.closureCriteria || '');

  // Tab 2: Details & Impact
  const [description, setDescription] = useState(initialRisk?.description || '');
  const [impactStatement, setImpactStatement] = useState(initialRisk?.impactStatement || '');
  const [impactCost, setImpactCost] = useState(initialRisk?.impactCost || '');
  const [impactSchedule, setImpactSchedule] = useState(initialRisk?.impactSchedule || '');
  const [impactPerformance, setImpactPerformance] = useState(initialRisk?.impactPerformance || '');
  const [isSpof, setIsSpof] = useState(initialRisk?.isSpof || false);
  const [spofDescription, setSpofDescription] = useState(initialRisk?.spofDescription || '');
  const [likelihood, setLikelihood] = useState(initialRisk?.likelihood || 3);
  const [impact, setImpact] = useState(initialRisk?.impact || 3);

  // Tab 3: Resources
  const [resourceCostNeeded, setResourceCostNeeded] = useState(initialRisk?.resourceCostNeeded || '');
  const [resourceScheduleNeeded, setResourceScheduleNeeded] = useState(initialRisk?.resourceScheduleNeeded || '');
  const [planRealism, setPlanRealism] = useState(initialRisk?.planRealism || '');

  // Tab 4: Monte Carlo
  const [mcMinCost, setMcMinCost] = useState(initialRisk?.mcMinCost || 0);
  const [mcMostLikelyCost, setMcMostLikelyCost] = useState(initialRisk?.mcMostLikelyCost || 0);
  const [mcMaxCost, setMcMaxCost] = useState(initialRisk?.mcMaxCost || 0);
  const [mcMinSchedule, setMcMinSchedule] = useState(initialRisk?.mcMinSchedule || 0);
  const [mcMostLikelySchedule, setMcMostLikelySchedule] = useState(initialRisk?.mcMostLikelySchedule || 0);
  const [mcMaxSchedule, setMcMaxSchedule] = useState(initialRisk?.mcMaxSchedule || 0);
  const [mcDistribution, setMcDistribution] = useState(initialRisk?.mcDistribution || 'Triangular');
  const [includeInMonteCarlo, setIncludeInMonteCarlo] = useState(initialRisk?.includeInMonteCarlo !== false);

  // Schedule Task Mapping (Risk -> Task UUIDs)
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [selectedTaskUuids, setSelectedTaskUuids] = useState([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/fields/risk').then(res => res.json()).catch(() => []),
      apiFetch('/api/dashboardSettings').then(res => res.json()).catch(() => ({})),
      apiFetch('/api/schedule').then(res => res.json()).catch(() => ({ tasks: [] })),
      apiFetch('/api/mapping').then(res => res.json()).catch(() => [])
    ]).then(([fieldsData, settingsData, scheduleData, mappingData]) => {
        if (Array.isArray(fieldsData)) {
          setFieldDefs(fieldsData);
          if (initialRisk && initialRisk.customFields) {
            const initialCustoms = {};
            initialRisk.customFields.forEach(cf => {
              initialCustoms[cf.name] = cf.value;
            });
            setCustomValues(initialCustoms);
          }
        }
        if (settingsData && !settingsData.error) {
          setDashboardSettings(settingsData);
        }
        if (scheduleData && Array.isArray(scheduleData.tasks)) {
          setScheduleTasks(scheduleData.tasks);
        }
        if (Array.isArray(mappingData) && initialRisk) {
          const riskMapping = mappingData.find(m => m.riskId === initialRisk.id);
          if (riskMapping && Array.isArray(riskMapping.taskUuids)) {
            setSelectedTaskUuids(riskMapping.taskUuids);
          } else if (riskMapping && riskMapping.taskId) {
            setSelectedTaskUuids([String(riskMapping.taskId)]);
          }
        }
      })
      .catch(console.error);
  }, [initialRisk]);

  const handleCustomChange = (name, value) => {
    setCustomValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }

    if (discoveredDate && closedDate && new Date(closedDate) < new Date(discoveredDate)) {
      toast.error('Closed Date cannot be earlier than Discovered Date.');
      return;
    }

    // Custom Fields Validation
    const missingRequired = fieldDefs.filter(f => f.required && !customValues[f.name]);
    if (missingRequired.length > 0) {
      toast.error(`Please fill out required fields: ${missingRequired.map(f => f.name).join(', ')}`);
      return;
    }

    // Monte Carlo validation
    if (includeInMonteCarlo) {
      if (Number(mcMinCost) > Number(mcMaxCost)) {
        toast.error('Monte Carlo: Min Cost cannot exceed Max Cost.');
        return;
      }
      if (Number(mcMinSchedule) > Number(mcMaxSchedule)) {
        toast.error('Monte Carlo: Min Schedule cannot exceed Max Schedule.');
        return;
      }
      if (Number(mcMostLikelyCost) < Number(mcMinCost) || Number(mcMostLikelyCost) > Number(mcMaxCost)) {
        toast.error('Monte Carlo: Most Likely Cost must be between Min and Max.');
        return;
      }
      if (Number(mcMostLikelySchedule) < Number(mcMinSchedule) || Number(mcMostLikelySchedule) > Number(mcMaxSchedule)) {
        toast.error('Monte Carlo: Most Likely Schedule must be between Min and Max.');
        return;
      }
    }

    setLoading(true);

    const finalLikelihood = itemType === 'Issue' ? 5 : likelihood;

    const newRiskPayload = {
      itemType, userRiskId, title, level, riskCategory, handlingStrategy,
      gpocs, cpocs, description, closureCriteria, impactStatement, impactCost,
      impactSchedule, impactPerformance, isSpof, spofDescription,
      likelihood: finalLikelihood, impact, resourceCostNeeded, resourceScheduleNeeded,
      planRealism,
      mcMinCost: Number(mcMinCost), mcMostLikelyCost: Number(mcMostLikelyCost), mcMaxCost: Number(mcMaxCost),
      mcMinSchedule: Number(mcMinSchedule), mcMostLikelySchedule: Number(mcMostLikelySchedule), mcMaxSchedule: Number(mcMaxSchedule),
      mcDistribution, includeInMonteCarlo,
      discoveredDate, approvedDate, closedDate
    };

    try {
      const isEdit = !!initialRisk;
      const endpoint = isEdit ? `/api/risks/${initialRisk.id}` : '/api/risks';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRiskPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} risk`);
      }

      const savedRisk = await response.json();

      const customEntries = fieldDefs
        .filter(f => customValues[f.name] !== undefined && customValues[f.name] !== '')
        .map(f => ({ name: f.name, value: customValues[f.name] }));

      if (customEntries.length > 0 || isEdit) {
        const cfRes = await apiFetch(`/api/risks/${savedRisk.id}/custom-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: customEntries })
        });
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          if (cfData && cfData.customFields) {
            savedRisk.customFields = cfData.customFields;
          } else if (customEntries.length > 0) {
            savedRisk.customFields = customEntries.map((f, i) => ({ id: i, ...f, riskId: savedRisk.id }));
          }
        }
      }

      // Update external task mapping (RiskID -> Task UUIDs)
      try {
        const mapRes = await apiFetch('/api/mapping');
        let allMappings = [];
        try { allMappings = await mapRes.json(); } catch { /* ignore */ }
        if (!Array.isArray(allMappings)) allMappings = [];

        const existingIdx = allMappings.findIndex(m => m.riskId === savedRisk.id);
        if (selectedTaskUuids.length > 0) {
          if (existingIdx >= 0) {
            allMappings[existingIdx] = { riskId: savedRisk.id, taskUuids: selectedTaskUuids };
          } else {
            allMappings.push({ riskId: savedRisk.id, taskUuids: selectedTaskUuids });
          }
        } else {
          if (existingIdx >= 0) {
            allMappings.splice(existingIdx, 1);
          }
        }

        await apiFetch('/api/mapping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allMappings)
        });
      } catch (mapErr) {
        console.error('Failed to save task mapping:', mapErr);
      }

      if (isEdit) {
        onRiskUpdated(savedRisk);
      } else {
        onRiskAdded(savedRisk);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error saving risk.');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (tabId) => ({
    padding: '0.35rem 0.85rem',
    fontSize: '0.85rem',
    background: activeTab === tabId ? 'var(--primary)' : 'transparent',
    color: activeTab === tabId ? '#fff' : 'var(--text-muted)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontWeight: 600,
    flex: 1
  });

  const renderPicklist = (key, value, onChange, placeholder = "Select...", isCustom = false) => {
    const pl = dashboardSettings?.picklists?.[isCustom ? `custom_${key}` : key] || { options: [], isMultiSelect: false };
    if (pl.isMultiSelect) {
      const valArray = Array.isArray(value) ? value : (value ? (typeof value === 'string' ? value.split(',').map(s=>s.trim()) : [value]) : []);
      return (
        <select 
          className="form-input" 
          multiple 
          value={valArray} 
          onChange={e => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            onChange(selected);
          }}
          style={{ minHeight: '60px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
        >
          {pl.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    } else {
      const valStr = Array.isArray(value) ? value[0] : value;
      return (
        <select className="form-input" value={valStr || ''} onChange={e => onChange(e.target.value)}>
          <option value="" disabled>{placeholder}</option>
          {pl.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large card" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0, gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {customHeader ? customHeader : <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{initialRisk ? (readOnly ? 'View' : 'Edit') : 'Add New'} R/I/O</h2>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="submit" form="risk-form" className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save R/I/O'}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Header */}
        <div style={{ display: 'flex', marginBottom: '0.75rem', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <button type="button" onClick={() => setActiveTab('general')} style={{ ...tabStyle('general'), borderRadius: '6px 0 0 6px', borderRight: 'none' }}>1. General</button>
          <button type="button" onClick={() => setActiveTab('details')} style={{ ...tabStyle('details'), borderRight: 'none' }}>2. Details & Impact</button>
          <button type="button" onClick={() => setActiveTab('resources')} style={{ ...tabStyle('resources'), borderRight: 'none' }}>3. Resources</button>
          <button type="button" onClick={() => setActiveTab('montecarlo')} style={{ ...tabStyle('montecarlo'), borderRadius: '0 6px 6px 0' }}>4. Monte Carlo</button>
        </div>

        <form id="risk-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflowY: 'auto', paddingRight: '8px', minHeight: 0 }}>
          <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* TAB 1: GENERAL */}
          <div style={{ display: activeTab === 'general' ? 'flex' : 'none', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.65rem' }}>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={itemType} onChange={e => setItemType(e.target.value)}>
                  <option value="Risk">Risk</option>
                  <option value="Issue">Issue</option>
                  <option value="Opportunity">Opportunity</option>
                </select>
              </div>
              <div>
                <label className="form-label">ID</label>
                <input required type="text" className="form-input" value={userRiskId} onChange={e => setUserRiskId(e.target.value)} placeholder="e.g. IT-001" />
              </div>
              <div>
                <label className="form-label">Title</label>
                <input required type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Breach" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label className="form-label">Level</label>
                {renderPicklist('level', level, setLevel, "Select Level")}
              </div>
              <div>
                <label className="form-label">Category</label>
                {renderPicklist('riskCategory', riskCategory, setRiskCategory, "Select Category")}
              </div>
              <div>
                <label className="form-label">Handling Strategy</label>
                {renderPicklist('handlingStrategy', handlingStrategy, setHandlingStrategy, "Select Strategy")}
              </div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label className="form-label">Description (Risk/Issue/Opportunity)</label>
              <div style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                <ReactQuill theme="snow" value={description} onChange={setDescription} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: itemType === 'Issue' ? '1fr' : '1fr 1fr', gap: '0.65rem' }}>
              {itemType !== 'Issue' && (
                <div>
                  <label className="form-label">Probability (1-5)</label>
                  <input required type="number" min="1" max="5" className="form-input" value={likelihood} onChange={e => setLikelihood(Number(e.target.value))} />
                </div>
              )}
              <div>
                <label className="form-label">Consequence (1-5)</label>
                <input required type="number" min="1" max="5" className="form-input" value={impact} onChange={e => setImpact(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label className="form-label">GPOCs (comma separated)</label>
                <input type="text" className="form-input" value={gpocs} onChange={e => setGpocs(e.target.value)} placeholder="e.g. John Doe, Jane Smith" />
              </div>
              <div>
                <label className="form-label">CPOCs (comma separated)</label>
                <input type="text" className="form-input" value={cpocs} onChange={e => setCpocs(e.target.value)} placeholder="e.g. Acme Corp POC" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label className="form-label">Discovered Date</label>
                <input type="date" className="form-input" value={discoveredDate} onChange={e => setDiscoveredDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Approved Date</label>
                <input type="date" className="form-input" value={approvedDate} onChange={e => setApprovedDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Closed Date</label>
                <input type="date" className="form-input" value={closedDate} onChange={e => setClosedDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Closure Criteria</label>
              <textarea 
                className="form-input" 
                rows="2" 
                value={closureCriteria} 
                onChange={e => setClosureCriteria(e.target.value)} 
                placeholder="Specific conditions or criteria required to close this item..." 
              />
            </div>
          </div>

          {/* TAB 2: DETAILS & IMPACT */}
          <div style={{ display: activeTab === 'details' ? 'flex' : 'none', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <label className="form-label">General Impact Statement</label>
              <div style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                <ReactQuill theme="snow" value={impactStatement} onChange={setImpactStatement} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label className="form-label">Impact on Cost</label>
                <input type="text" className="form-input" value={impactCost} onChange={e => setImpactCost(e.target.value)} placeholder="Material $ or hours" />
              </div>
              <div>
                <label className="form-label">Impact on Schedule</label>
                <input type="text" className="form-input" value={impactSchedule} onChange={e => setImpactSchedule(e.target.value)} placeholder="Days/Weeks lost" />
              </div>
              <div>
                <label className="form-label">Impact on Performance</label>
                <input type="text" className="form-input" value={impactPerformance} onChange={e => setImpactPerformance(e.target.value)} placeholder="Loss or gain" />
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isSpof ? '0.5rem' : '0' }}>
                <input type="checkbox" id="spof" checked={isSpof} onChange={e => setIsSpof(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                <label htmlFor="spof" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>This is a Single Point of Failure (SPoF)</label>
              </div>
              {isSpof && (
                <div>
                  <label className="form-label">Why is this a SPoF?</label>
                  <input type="text" className="form-input" value={spofDescription} onChange={e => setSpofDescription(e.target.value)} />
                </div>
              )}
            </div>

            {/* Linked Schedule Tasks (Risk -> Task UUIDs) */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, fontSize: '0.85rem' }}>
                    Linked Schedule Tasks ({selectedTaskUuids.length} selected)
                  </label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Map this {itemType.toLowerCase()} to specific tasks by task UUID
                  </div>
                </div>
                {scheduleTasks.length > 4 && (
                  <input 
                    type="text" 
                    placeholder="Filter tasks..." 
                    value={taskSearchQuery} 
                    onChange={e => setTaskSearchQuery(e.target.value)} 
                    className="form-input" 
                    style={{ width: '160px', padding: '2px 6px', fontSize: '0.8rem' }} 
                  />
                )}
              </div>
              
              {scheduleTasks.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                  No schedule tasks loaded. Import a schedule in the Project Schedule view to link tasks.
                </div>
              ) : (
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                  {scheduleTasks
                    .filter(t => !taskSearchQuery || (t.name && t.name.toLowerCase().includes(taskSearchQuery.toLowerCase())) || (t.uuid && t.uuid.toLowerCase().includes(taskSearchQuery.toLowerCase())) || (t.id && String(t.id).includes(taskSearchQuery)))
                    .map(t => {
                      const taskUuid = t.uuid || String(t.id);
                      const isChecked = selectedTaskUuids.includes(taskUuid);
                      return (
                        <label 
                          key={taskUuid} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '4px 6px', 
                            borderRadius: '4px', 
                            background: isChecked ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-hover)', 
                            border: isChecked ? '1px solid var(--primary)' : '1px solid transparent',
                            cursor: readOnly ? 'default' : 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            disabled={readOnly}
                            onChange={() => {
                              setSelectedTaskUuids(prev => 
                                prev.includes(taskUuid) ? prev.filter(u => u !== taskUuid) : [...prev, taskUuid]
                              );
                            }}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.id}: {t.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              UUID: {taskUuid} {t.duration ? `• ${t.duration}d` : ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* TAB 3: RESOURCES */}
          <div style={{ display: activeTab === 'resources' ? 'flex' : 'none', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label className="form-label">Resource Cost Needed</label>
                <input type="text" className="form-input" value={resourceCostNeeded} onChange={e => setResourceCostNeeded(e.target.value)} placeholder="Material $ / Labor hours" />
              </div>
              <div>
                <label className="form-label">Resource Schedule Needed</label>
                <input type="text" className="form-input" value={resourceScheduleNeeded} onChange={e => setResourceScheduleNeeded(e.target.value)} placeholder="Days / Weeks needed" />
              </div>
            </div>
            <div>
              <label className="form-label">Plan Realism</label>
              <textarea className="form-input" rows="2" value={planRealism} onChange={e => setPlanRealism(e.target.value)} placeholder="How realistic is the plan?" />
            </div>

            {/* Admin-defined custom fields */}
            {fieldDefs.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.65rem', marginTop: '0.35rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Additional Admin Fields</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {fieldDefs.map(field => (
                    <div key={field.id}>
                      <label className="form-label">{field.name} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                      {field.fieldType === 'picklist' ? (
                        renderPicklist(field.name, customValues[field.name], val => handleCustomChange(field.name, val), "Select...", true)
                      ) : (
                        <input
                          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                          className="form-input" required={field.required}
                          value={customValues[field.name] || ''} onChange={e => handleCustomChange(field.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TAB 4: MONTE CARLO */}
          <div style={{ display: activeTab === 'montecarlo' ? 'flex' : 'none', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="includeInMonteCarlo" 
                checked={includeInMonteCarlo} 
                onChange={e => setIncludeInMonteCarlo(e.target.checked)} 
                style={{ width: '1rem', height: '1rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="includeInMonteCarlo" style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', cursor: 'pointer' }}>
                Include this item in Monte Carlo Analysis
              </label>
            </div>
            
            <div style={{ opacity: includeInMonteCarlo ? 1 : 0.5, pointerEvents: includeInMonteCarlo ? 'auto' : 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Simulation Distribution Type</label>
              <select className="form-input" value={mcDistribution} onChange={e => setMcDistribution(e.target.value)}>
                <option value="Triangular">Triangular (Standard)</option>
                <option value="PERT">PERT (Weighted towards Most Likely)</option>
                <option value="Uniform">Uniform (Equal probability across range)</option>
              </select>
            </div>
            
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '0.85rem' }}>Cost Impact ($)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="form-label">{itemType === 'Opportunity' ? 'Min Saved' : 'Min Cost'}</label>
                  <input type="number" className="form-input" value={mcMinCost} onChange={e => setMcMinCost(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Most Likely</label>
                  <input type="number" className="form-input" value={mcMostLikelyCost} onChange={e => setMcMostLikelyCost(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">{itemType === 'Opportunity' ? 'Max Saved' : 'Max Cost'}</label>
                  <input type="number" className="form-input" value={mcMaxCost} onChange={e => setMcMaxCost(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '0.85rem' }}>Schedule Impact (Days {itemType === 'Opportunity' ? 'Saved' : 'Delay'})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="form-label">{itemType === 'Opportunity' ? 'Min Saved' : 'Min Delay'}</label>
                  <input type="number" className="form-input" value={mcMinSchedule} onChange={e => setMcMinSchedule(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Most Likely</label>
                  <input type="number" className="form-input" value={mcMostLikelySchedule} onChange={e => setMcMostLikelySchedule(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">{itemType === 'Opportunity' ? 'Max Saved' : 'Max Delay'}</label>
                  <input type="number" className="form-input" value={mcMaxSchedule} onChange={e => setMcMaxSchedule(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          </div>
          </fieldset>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', marginRight: '0.75rem' }}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save R/I/O'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RiskFormModal;
