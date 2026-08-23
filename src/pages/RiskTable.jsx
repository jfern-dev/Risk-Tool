import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { PlusCircle, Search, X, ArrowUpDown} from 'lucide-react';
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
    if (type === 'multiselect') {
      const valArray = Array.isArray(currentValue) ? currentValue : (currentValue ? (typeof currentValue === 'string' ? currentValue.split(',').map(s=>s.trim()) : [currentValue]) : []);
      return (
        <select
          ref={inputRef}
          multiple
          value={valArray}
          onChange={(e) => setCurrentValue(Array.from(e.target.selectedOptions, option => option.value))}
          onBlur={handleBlur}
          className="form-input"
          style={{ padding: '0.25rem 0.5rem', width: '100%', minHeight: '60px' }}
        >
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

  const displayValue = Array.isArray(value) ? (value.length ? value.join(', ') : null) : value;
  const strippedValue = typeof displayValue === 'string' && type === 'textarea' ? displayValue.replace(/<[^>]+>/g, '') : displayValue;

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      style={{ 
        cursor: 'pointer', padding: '0.25rem 0.35rem', borderRadius: '4px', 
        transition: 'all 0.18s ease', minHeight: '24px', whiteSpace: type === 'textarea' ? 'pre-wrap' : 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px',
        border: '1px solid transparent'
      }}
      onMouseOver={e => {
        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {strippedValue || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.6 }}>-</span>}
    </div>
  );
};

const CheckboxCell = ({ value, field, onSave }) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
    <input 
      type="checkbox" 
      checked={!!value} 
      onChange={e => onSave(field, e.target.checked)} 
      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
    />
  </div>
);

const RiskTable = () => {
  const [risks, setRisks] = useState([]);
  const [riskFields, setRiskFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardSettings, setDashboardSettings] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'userRiskId', direction: 'asc' });

  useEffect(() => {
    Promise.all([
      apiFetch('/api/risks').then(r => r.json()),
      apiFetch('/api/fields/risk').then(r => r.json()),
      apiFetch('/api/dashboardSettings').then(r => r.json())
    ])
      .then(([risksData, fieldsData, settingsData]) => {
        if (!risksData.error && Array.isArray(risksData)) setRisks(risksData);
        if (!fieldsData.error && Array.isArray(fieldsData)) setRiskFields(fieldsData);
        if (!settingsData.error) setDashboardSettings(settingsData);
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
      const response = await apiFetch(`/api/risks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });
      if (!response.ok) throw new Error('Failed to update');
      const updatedRisk = await response.json();
      setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updatedRisk } : r));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCreateNewRisk = async () => {
    try {
      const response = await apiFetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: filterType === 'All' ? 'Risk' : filterType,
          title: 'New Item',
          userRiskId: `R-${String((risks.reduce((max, r) => {
            const match = r.userRiskId?.match(/\d+$/);
            return match ? Math.max(max, parseInt(match[0])) : max;
          }, 0)) + 1).padStart(3, '0')}`,
          likelihood: 1,
          impact: 1,
        })
      });
      if (!response.ok) throw new Error('Failed to create row');
      const newRisk = await response.json();
      setRisks(prev => [...prev, newRisk]);
      toast.success('New item row added');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading Table...</div>;

  const filteredRisks = risks.filter(r => {
    const typeMatch = filterType === 'All' || (r.itemType || 'Risk') === filterType;
    const searchMatch = !searchQuery || 
      (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.userRiskId && r.userRiskId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.gpocs && r.gpocs.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.cpocs && r.cpocs.toLowerCase().includes(searchQuery.toLowerCase()));
    return typeMatch && searchMatch;
  });
  
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    let aValue = a[sortConfig.key] ?? '';
    let bValue = b[sortConfig.key] ?? '';
    
    if (sortConfig.key === 'score') {
      aValue = (a.likelihood || 0) * (a.impact || 0);
      bValue = (b.likelihood || 0) * (b.impact || 0);
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortHeader = ({ label, sortKey }) => (
    <th 
      style={{ padding: '0.45rem 0.6rem', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', color: sortConfig.key === sortKey ? 'var(--primary-hover)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
      onClick={() => handleSort(sortKey)}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <span>{label}</span>
        {sortConfig.key === sortKey ? (
          <span style={{ color: 'var(--primary)' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
        ) : (
          <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
        )}
      </div>
    </th>
  );

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '0.85rem 1.25rem' }}>
      
      {/* Table Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.25)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          {[
            { id: 'All', label: 'All Items', count: risks.length },
            { id: 'Risk', label: 'Risks', count: risks.filter(r => (r.itemType || 'Risk') === 'Risk').length },
            { id: 'Issue', label: 'Issues', count: risks.filter(r => (r.itemType || 'Risk') === 'Issue').length },
            { id: 'Opportunity', label: 'Opportunities', count: risks.filter(r => (r.itemType || 'Risk') === 'Opportunity').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`filter-chip ${filterType === tab.id ? 'active' : ''}`}
              style={{ borderRadius: '6px' }}
            >
              <span>{tab.label}</span>
              <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '9999px', background: filterType === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          
          {/* Quick Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '28px', paddingRight: searchQuery ? '24px' : '8px', width: '220px', fontSize: '0.8rem' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleCreateNewRisk}>
            <PlusCircle size={15} />
            Add Row
          </button>
        </div>
      </div>
      
      <div className="card" style={{ overflowX: 'auto', padding: '0', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)' }}>
            <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '2px solid var(--border)' }}>
              <SortHeader label="ID" sortKey="userRiskId" />
              <SortHeader label="Type" sortKey="itemType" />
              <SortHeader label="Title" sortKey="title" />
              <SortHeader label="Level" sortKey="level" />
              <SortHeader label="Category" sortKey="riskCategory" />
              <SortHeader label="Strategy" sortKey="handlingStrategy" />
              <SortHeader label="GPOCs" sortKey="gpocs" />
              <SortHeader label="CPOCs" sortKey="cpocs" />
              <SortHeader label="Description" sortKey="description" />
              <SortHeader label="Closure Criteria" sortKey="closureCriteria" />
              <SortHeader label="P" sortKey="likelihood" />
              <SortHeader label="C" sortKey="impact" />
              <SortHeader label="Score" sortKey="score" />
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Impact Statement</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Impact (Cost)</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Impact (Sched)</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Impact (Perf)</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>SPoF?</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>SPoF Desc</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Res. Cost</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Res. Sched</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>Plan Realism</th>
              {riskFields.map(f => (
                <th key={f.id} style={{ padding: '0.4rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>{f.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRisks.length === 0 ? (
              <tr>
                <td colSpan={25 + riskFields.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No items found.</td>
              </tr>
            ) : (
              sortedRisks.map(risk => {
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
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', borderRight: '1px solid var(--border)' }}>
                      <EditableCell value={risk.userRiskId} field="userRiskId" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={type} field="itemType" type="select" options={['Risk', 'Issue', 'Opportunity']} onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.title} field="title" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell 
                        value={risk.level} field="level" 
                        type={dashboardSettings?.picklists?.level?.isMultiSelect ? 'multiselect' : 'select'} 
                        options={dashboardSettings?.picklists?.level?.options || ['Program', 'Internal']} 
                        onSave={(field, val) => handleSave(risk.id, field, val)} 
                      />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell 
                        value={risk.riskCategory} field="riskCategory" 
                        type={dashboardSettings?.picklists?.riskCategory?.isMultiSelect ? 'multiselect' : 'select'} 
                        options={dashboardSettings?.picklists?.riskCategory?.options || ['Schedule', 'Cost', 'Technical']} 
                        onSave={(field, val) => handleSave(risk.id, field, val)} 
                      />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell 
                        value={risk.handlingStrategy} field="handlingStrategy" 
                        type={dashboardSettings?.picklists?.handlingStrategy?.isMultiSelect ? 'multiselect' : 'select'} 
                        options={dashboardSettings?.picklists?.handlingStrategy?.options || ['Accept', 'Decline', 'Transfer', 'Mitigate/Execute']} 
                        onSave={(field, val) => handleSave(risk.id, field, val)} 
                      />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.gpocs} field="gpocs" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.cpocs} field="cpocs" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', minWidth: '180px' }}>
                      <EditableCell value={risk.description} field="description" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', minWidth: '180px' }}>
                      <EditableCell value={risk.closureCriteria} field="closureCriteria" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', background: 'rgba(0,0,0,0.2)' }}>
                      {type === 'Issue' ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>N/A</div>
                      ) : (
                        <EditableCell value={l} field="likelihood" type="number" onSave={(field, val) => handleSave(risk.id, field, Number(val))} />
                      )}
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', background: 'rgba(0,0,0,0.2)' }}>
                      <EditableCell value={i} field="impact" type="number" onSave={(field, val) => handleSave(risk.id, field, Number(val))} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', background: 'rgba(0,0,0,0.2)' }}>
                      <span className={badgeClass} style={{ padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {type === 'Issue' ? i : score}
                      </span>
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top', minWidth: '180px' }}>
                      <EditableCell value={risk.impactStatement} field="impactStatement" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.impactCost} field="impactCost" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.impactSchedule} field="impactSchedule" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.impactPerformance} field="impactPerformance" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <CheckboxCell value={risk.isSpof} field="isSpof" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.spofDescription} field="spofDescription" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.resourceCostNeeded} field="resourceCostNeeded" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.resourceScheduleNeeded} field="resourceScheduleNeeded" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                      <EditableCell value={risk.planRealism} field="planRealism" type="textarea" onSave={(field, val) => handleSave(risk.id, field, val)} />
                    </td>
                    
                    {riskFields.map(f => {
                      const customVal = (risk.customFields || []).find(c => c.name === f.name);
                      return (
                        <td key={f.id} style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>
                        <EditableCell 
                          value={customVal ? customVal.value : ''} 
                          field={`custom:${f.name}`} 
                          type={f.fieldType === 'picklist' ? (dashboardSettings?.picklists?.[`custom_${f.name}`]?.isMultiSelect ? 'multiselect' : 'select') : (f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text')} 
                          options={f.fieldType === 'picklist' ? (dashboardSettings?.picklists?.[`custom_${f.name}`]?.options || []) : []}
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
              <td colSpan={25 + riskFields.length} style={{ padding: '0.5rem', textAlign: 'center' }}>
                <button 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px dashed var(--border)', width: '100%', padding: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}
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
