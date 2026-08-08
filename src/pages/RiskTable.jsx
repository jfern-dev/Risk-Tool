import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';

const EditableCell = ({ value, field, type = 'text', onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
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
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value);
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
          onKeyDown={(e) => { if (e.key === 'Escape') { setIsEditing(false); setCurrentValue(value); } }}
          className="form-input"
          style={{ padding: '0.25rem 0.5rem', minHeight: '60px' }}
        />
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
        style={{ padding: '0.25rem 0.5rem' }}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      style={{ 
        cursor: 'pointer', 
        padding: '0.25rem', 
        borderRadius: '4px', 
        transition: 'background 0.2s',
        minHeight: '24px'
      }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      {value || <span style={{ color: 'var(--text-muted)' }}>Empty</span>}
    </div>
  );
};

const RiskTable = () => {
  const [risks, setRisks] = useState([]);
  const [riskFields, setRiskFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('http://localhost:3000/api/risks').then(r => r.json()),
      apiFetch('http://localhost:3000/api/fields/risk').then(r => r.json())
    ])
      .then(([risksData, fieldsData]) => {
        if (!risksData.error && Array.isArray(risksData)) {
          setRisks(risksData);
        }
        if (!fieldsData.error && Array.isArray(fieldsData)) {
          setRiskFields(fieldsData);
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
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update');
      }
      
      const updatedRisk = await response.json();
      setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updatedRisk } : r));
    } catch (error) {
      alert(error.message);
      // Re-fetch to fix state on error
      apiFetch('http://localhost:3000/api/risks')
        .then(res => res.json())
        .then(data => {
          if (!data.error && Array.isArray(data)) {
            setRisks(data);
          }
        });
    }
  };

  const handleCreateNewRisk = async () => {
    try {
      const response = await apiFetch('http://localhost:3000/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Risk',
          description: '',
          userRiskId: `R-${String(risks.length + 1).padStart(3, '0')}`,
          likelihood: 1,
          impact: 1,
          status: 'identified'
        })
      });
      if (!response.ok) throw new Error('Failed to create risk');
      const newRisk = await response.json();
      setRisks(prev => [...prev, newRisk]);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading ERM Data...</div>;

  return (
    <div className="container">
      <h2 style={{ marginBottom: '2rem' }}>Risk Data Table</h2>
      
      <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Risk ID</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Title</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Description</th>
              <th style={{ padding: '1rem', fontWeight: 600, width: '100px', whiteSpace: 'nowrap' }}>Likelihood</th>
              <th style={{ padding: '1rem', fontWeight: 600, width: '100px', whiteSpace: 'nowrap' }}>Impact</th>
              <th style={{ padding: '1rem', fontWeight: 600, width: '100px', whiteSpace: 'nowrap' }}>Score</th>
              {riskFields.map(f => (
                <th key={f.id} style={{ padding: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risks.length === 0 ? (
              <tr>
                <td colSpan={6 + riskFields.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No risks found.</td>
              </tr>
            ) : (
              risks.map(risk => (
                <tr key={risk.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <EditableCell 
                      value={risk.userRiskId} 
                      field="userRiskId" 
                      onSave={(field, val) => handleSave(risk.id, field, val)} 
                    />
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <EditableCell 
                      value={risk.title} 
                      field="title" 
                      onSave={(field, val) => handleSave(risk.id, field, val)} 
                    />
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top', minWidth: '300px' }}>
                    <EditableCell 
                      value={risk.description || ''} 
                      field="description" 
                      type="textarea"
                      onSave={(field, val) => handleSave(risk.id, field, val)} 
                    />
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <EditableCell 
                      value={risk.likelihood} 
                      field="likelihood" 
                      type="number"
                      onSave={(field, val) => handleSave(risk.id, field, val)} 
                    />
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <EditableCell 
                      value={risk.impact} 
                      field="impact" 
                      type="number"
                      onSave={(field, val) => handleSave(risk.id, field, val)} 
                    />
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: risk.likelihood * risk.impact >= 15 ? 'var(--danger)' : 
                                 risk.likelihood * risk.impact >= 8 ? 'var(--warning)' : 
                                 'var(--success)',
                      fontWeight: 'bold'
                    }}>
                      {risk.likelihood * risk.impact}
                    </span>
                  </td>
                  {riskFields.map(f => {
                    const cf = (risk.customFields || []).find(c => c.name === f.name);
                    return (
                      <td key={f.id} style={{ padding: '1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
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
              ))
            )}
            
            {/* Blank Row for Adding New Risk */}
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <td colSpan={6 + riskFields.length} style={{ padding: '1rem', textAlign: 'center' }}>
                <button 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px dashed var(--border)', width: '100%', padding: '0.75rem', color: 'var(--text-muted)' }}
                  onClick={handleCreateNewRisk}
                  onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  + Click to add a new risk row
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
