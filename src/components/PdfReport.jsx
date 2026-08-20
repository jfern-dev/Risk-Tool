import React, { useState, useEffect } from 'react';
import RiskMatrix from './RiskMatrix';
import RiskTimeline from './RiskTimeline';
import { apiFetch } from '../utils/api';

const PdfReport = ({ risks }) => {
  const [dashboardSettings, setDashboardSettings] = useState(null);
  const [hiddenFields, setHiddenFields] = useState([]);

  useEffect(() => {
    apiFetch('http://localhost:3000/api/dashboardSettings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setDashboardSettings(data);
          if (data.hiddenFields) setHiddenFields(data.hiddenFields);
        }
      }).catch(console.error);
  }, []);

  if (!risks || risks.length === 0) return null;

  return (
    <div className="print-only">
      {risks.map((risk, index) => {
        const currentItemType = risk.itemType || 'Risk';
        
        return (
          <div key={risk.id || index} className="print-page" style={{ padding: '10px 20px', fontFamily: 'sans-serif', boxSizing: 'border-box', zoom: 0.85 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #ccc', paddingBottom: '8px', marginBottom: '15px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', padding: '4px 10px', background: '#3b82f6', color: 'white', borderRadius: '6px', fontWeight: 'bold', flexShrink: 0 }}>
                    {risk.userRiskId}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'black', maxWidth: '85%', wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{risk.title}</h2>
                </div>
                <span style={{ color: '#555', fontSize: '0.9rem' }}>{currentItemType} | Level: {risk.level || 'N/A'}</span>
              </div>
            </div>

            {/* Layout Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '20px' }}>
              
              {/* Left Column: Characteristics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Fixed Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#666' }}>Category</strong>
                    <div style={{ fontSize: '1rem', marginTop: '2px' }}>{Array.isArray(risk.riskCategory) ? risk.riskCategory.join(', ') : (risk.riskCategory || 'N/A')}</div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#666' }}>Handling Strategy</strong>
                    <div style={{ fontSize: '1rem', marginTop: '2px' }}>{Array.isArray(risk.handlingStrategy) ? risk.handlingStrategy.join(', ') : (risk.handlingStrategy || 'N/A')}</div>
                  </div>
                </div>

                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Description</strong>
                  <div 
                    style={{ fontSize: '1rem', marginTop: '2px', whiteSpace: 'pre-wrap', color: 'black' }} 
                    dangerouslySetInnerHTML={{ __html: risk.description || 'No description provided.' }}
                  />
                </div>

                {/* Configurable/Dynamic Fields */}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { id: 'gpocs', label: 'GPOCs', value: risk.gpocs },
                    { id: 'cpocs', label: 'CPOCs', value: risk.cpocs }
                  ].map(field => {
                    if (hiddenFields.includes(field.id) || !field.value) return null;
                    const displayVal = Array.isArray(field.value) ? field.value.join(', ') : field.value;
                    return (
                      <div key={field.id} style={{ gridColumn: field.fullWidth ? '1 / -1' : 'auto' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#666' }}>{field.label}</strong>
                        <div style={{ fontSize: '1rem', marginTop: '2px', whiteSpace: field.fullWidth ? 'pre-wrap' : 'normal' }}>{displayVal}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Matrix & Status Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                <strong style={{ fontSize: '1rem', color: 'black' }}>Risk Matrix</strong>
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '-50px' }}>
                  <RiskMatrix 
                    risks={[risk]}
                    activeType={currentItemType}
                    hideIds={false}
                    isPrint={true}
                  />
                </div>

                <div style={{ marginTop: '0.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Latest Status Log</strong>
                  {(risk.statusLogs && risk.statusLogs.length > 0) ? (
                    [...risk.statusLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 1).map(log => (
                      <div key={log.id} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', textAlign: 'left', background: '#f9f9f9', color: 'black' }}>
                        <div style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.25rem' }}>
                          {new Date(log.date).toLocaleDateString()}
                        </div>
                        {log.status && <div style={{ marginBottom: '0.25rem' }}><strong>Status:</strong> {log.status}</div>}
                        {log.takeaways && <div style={{ marginBottom: '0.25rem' }}><strong>Takeaways:</strong> {log.takeaways}</div>}
                        {log.challenges && <div><strong>Challenges:</strong> {log.challenges}</div>}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>No logs yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section: Burndown Plot & Action List */}
            <div style={{ borderTop: '1px solid #ccc', paddingTop: '15px', marginTop: '15px', display: 'grid', gridTemplateColumns: '65% 35%', gap: '20px' }}>
              <div>
                <RiskTimeline risk={risk} isPrint={true} />
                {(!risk.burndownSteps || risk.burndownSteps.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#888', fontSize: '0.9rem', border: '1px dashed #ccc', borderRadius: '8px', marginTop: '10px' }}>
                    No action plan established for this item yet.
                  </div>
                )}
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Action List</h5>
                {risk.burndownSteps && risk.burndownSteps.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: 'black' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                        <th style={{ padding: '4px 0', width: '65%' }}>Action</th>
                        <th style={{ padding: '4px 0', width: '35%' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...risk.burndownSteps].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map(step => (
                        <tr key={step.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '4px 0', paddingRight: '10px' }}>{step.description}</td>
                          <td style={{ padding: '4px 0', color: step.isCompleted ? '#10B981' : 'inherit', fontWeight: step.isCompleted ? 'bold' : 'normal' }}>
                            {step.isCompleted ? 'Complete' : (step.targetDate ? new Date(step.targetDate).toLocaleDateString() : 'N/A')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>No actions established.</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PdfReport;
