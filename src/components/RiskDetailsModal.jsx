import React, { useState, useEffect } from 'react';
import { X, Pencil, TrendingDown, Camera, Clock, FileText } from 'lucide-react';
import RiskMatrix from './RiskMatrix';
import RiskTimeline from './RiskTimeline';
import { apiFetch } from '../utils/api';

const RiskDetailsModal = ({ risk, onClose, onActionClick }) => {
  const [fieldDefs, setFieldDefs] = useState([]);
  const [hiddenFields, setHiddenFields] = useState([]);
  const [mappedTasks, setMappedTasks] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/fields/risk').then(res => res.json()).catch(() => []),
      apiFetch('/api/dashboardSettings').then(res => res.json()).catch(() => ({})),
      apiFetch('/api/schedule').then(res => res.json()).catch(() => ({ tasks: [] })),
      apiFetch('/api/mapping').then(res => res.json()).catch(() => [])
    ]).then(([fieldsData, settingsData, scheduleData, mappingData]) => {
      if (Array.isArray(fieldsData)) setFieldDefs(fieldsData);
      if (settingsData && settingsData.hiddenFields) setHiddenFields(settingsData.hiddenFields);

      if (risk && Array.isArray(mappingData) && scheduleData && Array.isArray(scheduleData.tasks)) {
        const riskMapping = mappingData.find(m => m.riskId === risk.id);
        const taskUuids = riskMapping?.taskUuids || (riskMapping?.taskId ? [String(riskMapping.taskId)] : []);
        if (taskUuids.length > 0) {
          const matched = scheduleData.tasks.filter(t => taskUuids.includes(t.uuid || String(t.id)) || taskUuids.includes(String(t.id)));
          setMappedTasks(matched);
        }
      }
    }).catch(console.error);
  }, [risk]);

  if (!risk) return null;

  const currentItemType = risk.itemType || 'Risk';
  
  return (
    <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.6)', padding: '1rem' }}>
      <div className="modal-content modal-large card" style={{ maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
              <span style={{ fontSize: '0.75rem', padding: '1px 6px', background: 'var(--primary)', color: 'white', borderRadius: '4px', fontWeight: 600 }}>
                {risk.userRiskId}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{risk.title}</h2>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{currentItemType} | Level: {risk.level || 'N/A'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Top Action Buttons Bar */}
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => onActionClick('edit', risk)}>
            <Pencil size={14} style={{ marginRight: '4px' }} /> Edit
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => onActionClick('burndown', risk)}>
            <TrendingDown size={14} style={{ marginRight: '4px' }} /> Action Plan ({risk.burndownSteps?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => onActionClick('snapshot', risk)}>
            <Camera size={14} style={{ marginRight: '4px' }} /> Snapshot
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => onActionClick('statusLog', risk)}>
            <Clock size={14} style={{ marginRight: '4px' }} /> Status Logs ({risk.statusLogs?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => onActionClick('attachments', risk)}>
            <FileText size={14} style={{ marginRight: '4px' }} /> Attachments ({risk.attachments?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => onActionClick('history', risk)}>
            <Clock size={14} style={{ marginRight: '4px' }} /> History ({risk.snapshots?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => {
            window.dispatchEvent(new CustomEvent('print-single-risk', { detail: risk.id }));
          }}>
            <FileText size={14} style={{ marginRight: '4px' }} /> Print to PDF
          </button>
        </div>

        {/* Top Section: Characteristics (75%) and Matrix (25%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.25rem' }}>
          
          {/* 75% Left Column: Characteristics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Fixed Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</strong>
                <div style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>{Array.isArray(risk.riskCategory) ? risk.riskCategory.join(', ') : (risk.riskCategory || 'N/A')}</div>
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Handling Strategy</strong>
                <div style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>{Array.isArray(risk.handlingStrategy) ? risk.handlingStrategy.join(', ') : (risk.handlingStrategy || 'N/A')}</div>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Description</strong>
              <div 
                style={{ fontSize: '0.875rem', marginTop: '0.15rem', whiteSpace: 'pre-wrap' }} 
                dangerouslySetInnerHTML={{ __html: risk.description || 'No description provided.' }}
              />
            </div>

            {/* Configurable/Dynamic Fields */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.65rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {[
                { id: 'level', label: 'Level', value: risk.level },
                { id: 'gpocs', label: 'GPOCs', value: risk.gpocs },
                { id: 'cpocs', label: 'CPOCs', value: risk.cpocs },
                { id: 'discoveredDate', label: 'Discovered Date', value: risk.discoveredDate },
                { id: 'approvedDate', label: 'Approved Date', value: risk.approvedDate },
                { id: 'closedDate', label: 'Closed Date', value: risk.closedDate },
                { id: 'closureCriteria', label: 'Closure Criteria', value: risk.closureCriteria, fullWidth: true },
                { id: 'impactStatement', label: 'General Impact Statement', value: risk.impactStatement, fullWidth: true },
                { id: 'impactCost', label: 'Impact on Cost', value: risk.impactCost },
                { id: 'impactSchedule', label: 'Impact on Schedule', value: risk.impactSchedule },
                { id: 'impactPerformance', label: 'Impact on Performance', value: risk.impactPerformance },
                { id: 'resourceCostNeeded', label: 'Resource Cost Needed', value: risk.resourceCostNeeded },
                { id: 'resourceScheduleNeeded', label: 'Resource Schedule Needed', value: risk.resourceScheduleNeeded },
                { id: 'planRealism', label: 'Plan Realism', value: risk.planRealism }
              ].map(field => {
                if (hiddenFields.includes(field.id) || !field.value) return null;
                const displayVal = Array.isArray(field.value) ? field.value.join(', ') : field.value;
                return (
                  <div key={field.id} style={{ gridColumn: field.fullWidth ? '1 / -1' : 'auto' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{field.label}</strong>
                    {field.id === 'impactStatement' ? (
                      <div 
                        style={{ fontSize: '0.875rem', marginTop: '0.15rem', whiteSpace: 'pre-wrap' }} 
                        dangerouslySetInnerHTML={{ __html: displayVal }} 
                      />
                    ) : (
                      <div style={{ fontSize: '0.875rem', marginTop: '0.15rem', whiteSpace: field.fullWidth ? 'pre-wrap' : 'normal' }}>{displayVal}</div>
                    )}
                  </div>
                );
              })}

              {risk.isSpof && !hiddenFields.includes('isSpof') && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.35rem' }}>
                  <strong style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Single Point of Failure (SPoF)</strong>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem' }}>{risk.spofDescription}</p>
                </div>
              )}

              {/* Render Admin-Configured Custom Fields */}
              {fieldDefs.map(field => {
                if (hiddenFields.includes(`custom_${field.name}`)) return null;
                
                const customField = risk.customFields?.find(cf => cf.name === field.name);
                const value = customField ? customField.value : 'N/A';
                const displayVal = Array.isArray(value) ? value.join(', ') : value;
                return (
                  <div key={field.id}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{field.name}</strong>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.15rem' }}>{displayVal}</div>
                  </div>
                );
              })}

              {/* Linked Schedule Tasks */}
              {mappedTasks.length > 0 && (
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.35rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Linked Schedule Tasks ({mappedTasks.length})
                  </strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {mappedTasks.map(task => (
                      <span 
                        key={task.uuid || task.id} 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'rgba(99, 102, 241, 0.15)', 
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: 'var(--text)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Task ID: ${task.id}\nDuration: ${task.duration}d\nUUID: ${task.uuid || task.id}`}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--primary-hover)' }}>{task.id}:</span>
                        <span>{task.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 25% Right Column: Matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <RiskMatrix risks={[risk]} activeType={currentItemType} showMarkers={true} showCounts={false} />
          </div>
        </div>

        {/* Bottom Section: Burndown Plot & Action List */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.35rem', display: 'grid', gridTemplateColumns: '65% 35%', gap: '1.25rem' }}>
          <div>
            <RiskTimeline risk={risk} />
            {(!risk.burndownSteps || risk.burndownSteps.length === 0) && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)', borderRadius: '6px', marginTop: '0.5rem' }}>
                No action plan established for this item yet. Add steps in the Action Plan to see the burndown timeline.
              </div>
            )}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '200px', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
            <h5 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Action List</h5>
            {risk.burndownSteps && risk.burndownSteps.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '4px 0', width: '65%' }}>Action</th>
                    <th style={{ padding: '4px 0', width: '35%' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...risk.burndownSteps].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map(step => (
                    <tr key={step.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 0', paddingRight: '8px' }}>{step.description}</td>
                      <td style={{ padding: '4px 0', color: step.isCompleted ? 'var(--success)' : 'inherit', fontWeight: step.isCompleted ? 'bold' : 'normal' }}>
                        {step.isCompleted ? 'Complete' : (step.targetDate ? new Date(step.targetDate).toLocaleDateString() : 'N/A')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No actions established.</div>
            )}
          </div>
        </div>

        {/* Footer: Close Button */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.35rem 0.85rem', fontSize: '0.85rem' }} onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default RiskDetailsModal;
