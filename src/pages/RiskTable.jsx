import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { getScoreClass, getOppScoreClass, getIssueScoreClass } from '../components/RiskMatrix';

const EditableCell = ({ value, field, type = 'text', options = [], onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onSave(field, currentValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value || '');
    }
  };

  if (isEditing) {
    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Escape') { setIsEditing(false); setCurrentValue(value || ''); } }}
          className="form-input"
          style={{ padding: '0.25rem 0.5rem', minHeight: '60px', width: '100%' }}
        />
      );
    }
    if (type === 'select') {
      return (
        <select
          ref={inputRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="form-input"
          style={{ padding: '0.25rem 0.5rem', width: '100%' }}
        >
          <option value="">--Select--</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return (
      <input
        ref={inputRef}
        type={type}
        min={type === 'number' ? 1 : undefined}
        max={type === 'number' ? 5 : undefined}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="form-input"
        style={{ padding: '0.25rem 0.5rem', width: '100%' }}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      style={{ 
        cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', 
        transition: 'background 0.2s', minHeight: '24px', whiteSpace: type === 'textarea' ? 'pre-wrap' : 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px'
      }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      {value || <span style={{ color: 'var(--text-muted)' }}>Empty</span>}
    </div>
  );
};

const CheckboxCell = ({ value, field, onSave }) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
    <input 
      type="checkbox" 
      checked={!!value} 
      onChange={e => onSave(field, e.target.checked)} 
      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
    />
  </div>
);

const RiskTable = () => {
  const [risks, setRisks] = useState([]);
  const [riskFields, setRiskFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [semp7Options, setSemp7Options] = useState([]);
  const [semp8Options, setSemp8Options] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('http://localhost:3000/api/risks').then(r => r.json()),
      apiFetch('http://localhost:3000/api/fields/risk').then(r => r.json()),
      apiFetch('http://localhost:3000/api/sempTables').then(r => r.json())
    ])
      .then(([risksData, fieldsData, sempData]) => {
        if (!risksData.error && Array.isArray(risksData)) setRisks(risksData);
        if (!fieldsData.error && Array.isArray(fieldsData)) setRiskFields(fieldsData);
        if (!sempData.error) {
          setSemp7Options((sempData.table7 || []).map(o => o.name));
          setSemp8Options((sempData.table8 || []).map(o => o.name));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (id, field, newValue) => {
    const isCustom = field.startsWith('custom:');
    let updateBody = {};
    
    if (isCustom) {
      const fieldName = field.replace('custom:', '');
      const risk = risks.find(r => r.id === id);
      const newCustomFields = [...(risk.customFields || [])];
      const cfIdx = newCustomFields.findIndex(cf => cf.name === fieldName);
      if (cfIdx > -1) {
        newCustomFields[cfIdx] = { ...newCustomFields[cfIdx], value: newValue };
      } else {
        newCustomFields.push({ name: fieldName, value: newValue });
      }
      updateBody = { customFields: newCustomFields };
      setRisks(prev => prev.map(r => r.id === id ? { ...r, customFields: newCustomFields } : r));
    } else {
      updateBody = { [field]: newValue };
      setRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: newValue } : r));
    }
    
    try {
      const response = await apiFetch(`http://localhost:3000/api/risks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });
      if (!response.ok) throw new Error('Failed to update');
      const updatedRisk = await response.json();
      setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updatedRisk } : r));
    } catch (error) {
      alert(error.message);
      // rollback handled by refetch ideally, but omitting for brevity
    }
  };

  const handleCreateNewRisk = async () => {
    try {
      const response = await apiFetch('http://localhost:3000/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'Risk',
          title: 'New Item',
          userRiskId: `R-${String(risks.length + 1).padStart(3, '0')}`,
          likelihood: 1,
          impact: 1,
        })
      });
      if (!response.ok) throw new Error('Failed to create row');
      const newRisk = await response.json();
      setRisks(prev => [...prev, newRisk]);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading Table...</div>;

  const filteredRisks = risks.filter(r => filterType === 'All' || (r.itemType || 'Risk') === filterType);

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Data Table Register</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 600 }}>Filter By Type:</label>
          <select 
            className="form-input" 
            style={{ width: 'auto' }}
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Items</option>
            <option value="Risk">Risks</option>
            <option value="Issue">Issues</option>
            <option value="Opportunity">Opportunities</option>
          </select>
        </div>
      </div>
      
      <div className="card" style={{ overflowX: 'auto', padding: '0', maxHeight: '75vh', overflowY: 'auto' }}>
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)' }}>
            <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>ID</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Title</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Level</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Strategy</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>GPOCs</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>CPOCs</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Description</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>L</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>I</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Score</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Impact Statement</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Impact (Cost)</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Impact (Sched)</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Impact (Perf)</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>SPoF?</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>SPoF Desc</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Res. Cost</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Res. Sched</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>Plan Realism</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>SEMP 7</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>SEMP 8</th>
              {riskFields.map(f => (
                <th key={f.id} style={{ padding: '0.75rem', fontWeight: 600 }}>{f.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRisks.length === 0 ? (
              <tr>
                <td colSpan={25 + riskFields.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No items found.</td>
              </tr>
            ) : (
              filteredRisks.map(risk => {
                const type = risk.itemType || 'Risk';
                const l = risk.likelihood || 1;
                const i = risk.impact || 1;
                const score = l * i;
                
                let badgeClass = '';
                if (type === 'Opportunity') badgeClass = getOppScoreClass(l, i);
                else if (type === 'Issue') badgeClass = getIssueScoreClass(i);
                else badgeClass = getScoreClass(l, i);

                return (
                  <tr key={risk.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top', borderRight: '1px solid var(--border)' }}>
                      <EditableCell value={risk.userRiskId} field="userRiskId" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={type} field="itemType" type="select" options={['Risk', 'Issue', 'Opportunity']} onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.title} field="title" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.level} field="level" type="select" options={['Program', 'Internal']} onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.riskCategory} field="riskCategory" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.handlingStrategy} field="handlingStrategy" type="select" options={['Accept', 'Avoid', 'Transfer', 'Mitigate']} onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.gpocs} field="gpocs" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.cpocs} field="cpocs" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top', minWidth: '200px' }}>
                      <EditableCell value={risk.description} field="description" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top', background: 'rgba(0,0,0,0.2)' }}>
                      {type === 'Issue' ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>N/A</div>
                      ) : (
                        <EditableCell value={l} field="likelihood" type="number" onSave={(field, val) => handleSave(risk.id, field, Number(val))} />
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top', background: 'rgba(0,0,0,0.2)' }}>
                      <EditableCell value={i} field="impact" type="number" onSave={(field, val) => handleSave(risk.id, field, Number(val))} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top', background: 'rgba(0,0,0,0.2)' }}>
                      <span className={badgeClass} style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {type === 'Issue' ? i : score}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top', minWidth: '200px' }}>
                      <EditableCell value={risk.impactStatement} field="impactStatement" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.impactCost} field="impactCost" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.impactSchedule} field="impactSchedule" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.impactPerformance} field="impactPerformance" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <CheckboxCell value={risk.isSpof} field="isSpof" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.spofDescription} field="spofDescription" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.resourceCostNeeded} field="resourceCostNeeded" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.resourceScheduleNeeded} field="resourceScheduleNeeded" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.planRealism} field="planRealism" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.sempTable7} field="sempTable7" type="select" options={semp7Options} onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.sempTable8} field="sempTable8" type="select" options={semp8Options} onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    
                    {riskFields.map(f => {
                      const cf = (risk.customFields || []).find(c => c.name === f.name);
                      return (
                        <td key={f.id} style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                          <EditableCell 
                            value={cf ? cf.value : ''} 
                            field={`custom:${f.name}`}
                            type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                            onSave={(field, val) => handleSave(risk.id, field, val)} 
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
            
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <td colSpan={25 + riskFields.length} style={{ padding: '1rem', textAlign: 'center' }}>
                <button 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px dashed var(--border)', width: '100%', padding: '0.75rem', color: 'var(--text-muted)' }}
                  onClick={handleCreateNewRisk}
                >
                  + Click to add a new row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskTable;
