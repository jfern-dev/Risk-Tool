import React, { useState, useEffect } from 'react';
import { X, Pencil, TrendingDown, Camera, Clock, FileText } from 'lucide-react';
import RiskMatrix from './RiskMatrix';
import RiskTimeline from './RiskTimeline';
import { apiFetch } from '../utils/api';

const RiskDetailsModal = ({ risk, onClose, onActionClick }) => {
  const [fieldDefs, setFieldDefs] = useState([]);
  const [hiddenFields, setHiddenFields] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('http://localhost:3000/api/fields/risk').then(res => res.json()),
      apiFetch('http://localhost:3000/api/dashboardSettings').then(res => res.json())
    ]).then(([fieldsData, settingsData]) => {
      if (Array.isArray(fieldsData)) setFieldDefs(fieldsData);
      if (settingsData && settingsData.hiddenFields) setHiddenFields(settingsData.hiddenFields);
    }).catch(console.error);
  }, []);

  if (!risk) return null;

  const currentItemType = risk.itemType || 'Risk';
  
  return (
    <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.6)', padding: '1rem' }}>
      <div className="modal-content modal-large card" style={{ maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: '4px' }}>
                {risk.userRiskId}
              </span>
              <h2 style={{ margin: 0 }}>{risk.title}</h2>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{currentItemType} | Level: {risk.level || 'N/A'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Top Section: Characteristics (75%) and Matrix (25%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
          
          {/* 75% Left Column: Characteristics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Fixed Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category</strong>
                <div style={{ fontSize: '1rem', marginTop: '0.25rem' }}>{Array.isArray(risk.riskCategory) ? risk.riskCategory.join(', ') : (risk.riskCategory || 'N/A')}</div>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Handling Strategy</strong>
                <div style={{ fontSize: '1rem', marginTop: '0.25rem' }}>{Array.isArray(risk.handlingStrategy) ? risk.handlingStrategy.join(', ') : (risk.handlingStrategy || 'N/A')}</div>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</strong>
              <div 
                style={{ fontSize: '1rem', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }} 
                dangerouslySetInnerHTML={{ __html: risk.description || 'No description provided.' }}
              />
            </div>

            {/* Configurable/Dynamic Fields */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { id: 'level', label: 'Level', value: risk.level },
                { id: 'gpocs', label: 'GPOCs', value: risk.gpocs },
                { id: 'cpocs', label: 'CPOCs', value: risk.cpocs },
                { id: 'discoveredDate', label: 'Discovered Date', value: risk.discoveredDate },
                { id: 'approvedDate', label: 'Approved Date', value: risk.approvedDate },
                { id: 'closedDate', label: 'Closed Date', value: risk.closedDate },
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
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{field.label}</strong>
                    {field.id === 'impactStatement' ? (
                      <div 
                        style={{ fontSize: '0.95rem', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }} 
                        dangerouslySetInnerHTML={{ __html: displayVal }} 
                      />
                    ) : (
                      <div style={{ fontSize: '0.95rem', marginTop: '0.25rem', whiteSpace: field.fullWidth ? 'pre-wrap' : 'normal' }}>{displayVal}</div>
                    )}
                  </div>
                );
              })}

              {risk.isSpof && !hiddenFields.includes('isSpof') && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                  <strong style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Single Point of Failure (SPoF)</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{risk.spofDescription}</p>
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
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{field.name}</strong>
                    <div style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>{displayVal}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 25% Right Column: Matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Current Rating
            </strong>
            <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', width: '100%', marginBottom: '-55px' }}>
              <RiskMatrix risks={[risk]} activeType={currentItemType} hideIds={true} />
            </div>
            
            <div style={{ marginTop: '0.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status Logs</strong>
              {(risk.statusLogs && risk.statusLogs.length > 0) ? (
                [...risk.statusLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                  <div key={log.id} style={{ background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.8rem', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                      {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {log.status && <div style={{ marginBottom: '0.25rem' }}><strong>Status:</strong> {log.status}</div>}
                    {log.takeaways && <div style={{ marginBottom: '0.25rem' }}><strong>Takeaways:</strong> {log.takeaways}</div>}
                    {log.challenges && <div><strong>Challenges:</strong> {log.challenges}</div>}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No logs yet</div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Section: Burndown Plot & Action List */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '65% 35%', gap: '2rem' }}>
          <div>
            <RiskTimeline risk={risk} />
            {(!risk.burndownSteps || risk.burndownSteps.length === 0) && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border)', borderRadius: '8px', marginTop: '1rem' }}>
                No action plan established for this item yet. Add steps in the Action Plan to see the burndown timeline.
              </div>
            )}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '250px', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Action List</h5>
            {risk.burndownSteps && risk.burndownSteps.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px 0', width: '65%' }}>Action</th>
                    <th style={{ padding: '6px 0', width: '35%' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...risk.burndownSteps].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map(step => (
                    <tr key={step.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 0', paddingRight: '10px' }}>{step.description}</td>
                      <td style={{ padding: '6px 0', color: step.isCompleted ? 'var(--success)' : 'inherit', fontWeight: step.isCompleted ? 'bold' : 'normal' }}>
                        {step.isCompleted ? 'Complete' : (step.targetDate ? new Date(step.targetDate).toLocaleDateString() : 'N/A')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No actions established.</div>
            )}
          </div>
        </div>

        {/* Footer: Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => onActionClick('edit', risk)}>
            <Pencil size={16} style={{ marginRight: '6px' }} /> Edit
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => onActionClick('burndown', risk)}>
            <TrendingDown size={16} style={{ marginRight: '6px' }} /> Action Plan ({risk.burndownSteps?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => onActionClick('snapshot', risk)}>
            <Camera size={16} style={{ marginRight: '6px' }} /> Snapshot
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => onActionClick('statusLog', risk)}>
            <Clock size={16} style={{ marginRight: '6px' }} /> Status Logs ({risk.statusLogs?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => {
            window.dispatchEvent(new CustomEvent('print-single-risk', { detail: risk.id }));
          }}>
            <FileText size={16} style={{ marginRight: '6px' }} /> Print to PDF
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => onActionClick('attachments', risk)}>
            <FileText size={16} style={{ marginRight: '6px' }} /> Attachments ({risk.attachments?.length || 0})
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => onActionClick('history', risk)}>
            <Clock size={16} style={{ marginRight: '6px' }} /> History ({risk.snapshots?.length || 0})
          </button>
        </div>

      </div>
    </div>
  );
};

export default RiskDetailsModal;
