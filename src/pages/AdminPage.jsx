import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Settings } from 'lucide-react';
import { apiFetch } from '../utils/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

const AdminPage = ({ isAdminAuthenticated, setIsAdminAuthenticated }) => {
  const [fields, setFields] = useState([]);
  const [sempTables, setSempTables] = useState({ table7: [], table8: [] });
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('risk');
  const [dashboardSettings, setDashboardSettings] = useState({ hiddenFields: [] });
  const [savingSettings, setSavingSettings] = useState(false);

  // New field form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [adding, setAdding] = useState(false);

  // New SEMP option form
  const [newSempTableType, setNewSempTableType] = useState('table7');
  const [newSempOption, setNewSempOption] = useState('');
  const [newSempColor, setNewSempColor] = useState('#3b82f6'); // default blue

  useEffect(() => {
    checkAuthStatus();
    fetchData();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const hasPassword = await window.electron.ipcRenderer.invoke('api-has-password');
      if (!hasPassword) {
        setIsAdminAuthenticated(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const isValid = await window.electron.ipcRenderer.invoke('api-verify-password', passwordInput);
      if (isValid) {
        setIsAdminAuthenticated(true);
      } else {
        setAuthError('Incorrect password');
      }
    } catch (err) {
      setAuthError('Error verifying password');
    }
  };

  const fetchData = async () => {
    try {
      const resFields = await apiFetch('http://localhost:3000/api/fields');
      const dataFields = await resFields.json();
      if (Array.isArray(dataFields)) setFields(dataFields);

      const resSemp = await apiFetch('http://localhost:3000/api/sempTables');
      const dataSemp = await resSemp.json();
      if (dataSemp && !dataSemp.error) setSempTables(dataSemp);

      const resSettings = await apiFetch('http://localhost:3000/api/dashboardSettings');
      const dataSettings = await resSettings.json();
      if (dataSettings && !dataSettings.error) setDashboardSettings(dataSettings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);

    try {
      const res = await apiFetch('http://localhost:3000/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          fieldType: newType,
          entityType: activeTab,
          required: newRequired
        })
      });
      if (!res.ok) throw new Error('Failed to add field');
      const field = await res.json();
      setFields([...fields, field]);
      setNewName('');
      setNewType('text');
      setNewRequired(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteField = async (id) => {
    if (!window.confirm('Delete this custom field definition? This will not remove data already saved.')) return;
    try {
      const res = await apiFetch(`http://localhost:3000/api/fields/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setFields(fields.filter(f => f.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSempOption = async (e) => {
    e.preventDefault();
    if (!newSempOption.trim()) return;
    setAdding(true);

    try {
      const updatedTables = { ...sempTables };
      updatedTables[newSempTableType].push({
        id: Date.now(),
        name: newSempOption.trim(),
        color: newSempColor
      });

      const res = await apiFetch('http://localhost:3000/api/sempTables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTables)
      });
      if (!res.ok) throw new Error('Failed to save SEMP tables');
      
      const savedTables = await res.json();
      setSempTables(savedTables);
      setNewSempOption('');
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSempOption = async (tableType, optionId) => {
    if (!window.confirm('Delete this SEMP option?')) return;
    try {
      const updatedTables = { ...sempTables };
      updatedTables[tableType] = updatedTables[tableType].filter(opt => opt.id !== optionId);

      const res = await apiFetch('http://localhost:3000/api/sempTables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTables)
      });
      if (!res.ok) throw new Error('Failed to save SEMP tables');
      
      const savedTables = await res.json();
      setSempTables(savedTables);
    } catch (err) {
      alert(err.message);
    }
  };

  const riskFields = fields.filter(f => f.entityType === 'risk');
  const burndownFields = fields.filter(f => f.entityType === 'burndown');
  const currentFields = activeTab === 'risk' ? riskFields : burndownFields;

  const handleToggleDashboardField = async (fieldName) => {
    setSavingSettings(true);
    try {
      const isHidden = dashboardSettings.hiddenFields.includes(fieldName);
      const newHiddenFields = isHidden
        ? dashboardSettings.hiddenFields.filter(f => f !== fieldName)
        : [...dashboardSettings.hiddenFields, fieldName];
      
      const newSettings = { ...dashboardSettings, hiddenFields: newHiddenFields };
      
      const res = await apiFetch('http://localhost:3000/api/dashboardSettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      const savedSettings = await res.json();
      setDashboardSettings(savedSettings);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };


  if (loading || checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <Settings size={24} />
            Admin Login
          </h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                autoFocus
              />
            </div>
            {authError && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>{authError}</p>}
            <button type="submit" className="btn" style={{ width: '100%' }}>Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Settings size={28} color="var(--primary)" />
        <h2 style={{ margin: 0 }}>Admin Panel</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('risk')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'risk' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'risk' ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: '8px 0 0 8px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          Risk Fields ({riskFields.length})
        </button>
        <button
          onClick={() => setActiveTab('burndown')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'burndown' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'burndown' ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          Burndown Fields ({burndownFields.length})
        </button>
        <button
          onClick={() => setActiveTab('semp')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'semp' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'semp' ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRight: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          SEMP Picklists
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          Dashboard View
        </button>
      </div>

      {/* CUSTOM FIELDS CONTENT */}
      {(activeTab === 'risk' || activeTab === 'burndown') && (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>
              {activeTab === 'risk' ? 'Risk' : 'Burndown Step'} Custom Fields
            </h3>
            {currentFields.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No custom fields defined yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentFields.map(field => (
                  <div
                    key={field.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1rem', background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '8px', border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{field.name}</span>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--border)', textTransform: 'capitalize' }}>
                        {field.fieldType}
                      </span>
                      {field.required && (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--danger)', color: '#fff' }}>
                          Required
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDeleteField(field.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Add New Field</h3>
            <form onSubmit={handleAddField} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Field Name</label>
                  <input required type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Owner, Department" />
                </div>
                <div>
                  <label className="form-label">Field Type</label>
                  <select className="form-input" value={newType} onChange={e => setNewType(e.target.value)}>
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="required-check" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                <label htmlFor="required-check" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Required field</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn" disabled={adding}>
                  <PlusCircle size={16} style={{ marginRight: '6px' }} />
                  {adding ? 'Adding...' : 'Add Field'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* SEMP TABLES CONTENT */}
      {activeTab === 'semp' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            {['table7', 'table8'].map(tableType => (
              <div key={tableType} className="card">
                <h3 style={{ marginTop: 0 }}>SEMP {tableType === 'table7' ? 'Table 7' : 'Table 8'} Options</h3>
                {!sempTables[tableType] || sempTables[tableType].length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No options defined yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sempTables[tableType].map(opt => (
                      <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: opt.color }}></div>
                          <span style={{ fontWeight: 600 }}>{opt.name}</span>
                        </div>
                        <button onClick={() => handleDeleteSempOption(tableType, opt.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Add SEMP Option</h3>
            <form onSubmit={handleAddSempOption} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Target Table</label>
                  <select className="form-input" value={newSempTableType} onChange={e => setNewSempTableType(e.target.value)}>
                    <option value="table7">SEMP Table 7</option>
                    <option value="table8">SEMP Table 8</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Option Name</label>
                  <input required type="text" className="form-input" value={newSempOption} onChange={e => setNewSempOption(e.target.value)} placeholder="e.g. Schedule Risk Level 1" />
                </div>
                <div>
                  <label className="form-label">Color (Hex)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={newSempColor} onChange={e => setNewSempColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }} />
                    <input required type="text" className="form-input" value={newSempColor} onChange={e => setNewSempColor(e.target.value)} placeholder="#Hex" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn" disabled={adding}>
                  <PlusCircle size={16} style={{ marginRight: '6px' }} />
                  {adding ? 'Adding...' : 'Add Option'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* DASHBOARD SETTINGS CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Configure Dashboard Modal Fields</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Select which fields should be visible in the Risk Details Modal on the dashboard. (Category, Strategy, and Description are always visible).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { id: 'level', label: 'Level' },
              { id: 'gpocs', label: 'GPOCs' },
              { id: 'cpocs', label: 'CPOCs' },
              { id: 'discoveredDate', label: 'Discovered Date' },
              { id: 'approvedDate', label: 'Approved Date' },
              { id: 'closedDate', label: 'Closed Date' },
              { id: 'impactStatement', label: 'General Impact Statement' },
              { id: 'impactCost', label: 'Impact on Cost' },
              { id: 'impactSchedule', label: 'Impact on Schedule' },
              { id: 'impactPerformance', label: 'Impact on Performance' },
              { id: 'isSpof', label: 'Single Point of Failure (SPoF)' },
              { id: 'resourceCostNeeded', label: 'Resource Cost Needed' },
              { id: 'resourceScheduleNeeded', label: 'Resource Schedule Needed' },
              { id: 'planRealism', label: 'Plan Realism' },
              { id: 'sempTable7', label: 'SEMP Table 7' },
              { id: 'sempTable8', label: 'SEMP Table 8' },
              ...riskFields.map(f => ({ id: `custom_${f.name}`, label: f.name }))
            ].map(field => {
              const isVisible = !dashboardSettings.hiddenFields.includes(field.id);
              return (
                <label 
                  key={field.id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.75rem', 
                    padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', 
                    borderRadius: '8px', border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isVisible} 
                    onChange={() => handleToggleDashboardField(field.id)}
                    disabled={savingSettings}
                    style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 600 }}>{field.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
