import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  CalendarClock, 
  TrendingUp, 
  Presentation, 
  Layout, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Download, 
  Layers, 
  Sliders, 
  Calendar, 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  Info, 
  Eye, 
  EyeOff, 
  ListPlus, 
  PlusCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', desc: 'Short or long alphanumeric string' },
  { value: 'number', label: 'Number', desc: 'Quantitative numeric value' },
  { value: 'date', label: 'Date', desc: 'Calendar date picker' },
  { value: 'picklist', label: 'Picklist', desc: 'Single or multi-select dropdown options' }
];

const NAV_TABS = [
  {
    category: 'WORKSPACE & MODULES',
    tabs: [
      { id: 'modules', label: 'Pages & Modules', icon: Layers, desc: 'Enable or hide app navigation views' },
      { id: 'dashboard', label: 'Dashboard & Modal Views', icon: Sliders, desc: 'Configure risk detail modal fields' }
    ]
  },
  {
    category: 'CUSTOM DATA STRUCTURE',
    tabs: [
      { id: 'risk', label: 'Risk Custom Fields', icon: Shield, desc: 'Attributes for RIO risk items' },
      { id: 'burndown', label: 'Burndown Step Fields', icon: CalendarClock, desc: 'Attributes for mitigation steps' },
      { id: 'picklists', label: 'Picklists & Dropdowns', icon: ListPlus, desc: 'Manage picklist choices & multi-select' }
    ]
  },
  {
    category: 'ENGINES & DATA MANAGEMENT',
    tabs: [
      { id: 'montecarlo', label: 'Monte Carlo Calibration', icon: TrendingUp, desc: 'Probability scores to % mapping' },
      { id: 'calendar', label: 'Work Calendar & Holidays', icon: Calendar, desc: 'Gantt & CPM working day rules' },
      { id: 'export', label: 'Data Export & Documentation', icon: FileSpreadsheet, desc: 'CSV format guide & direct export' }
    ]
  }
];

export default function AdminPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('modules');
  const [dashboardSettings, setDashboardSettings] = useState({ hiddenFields: [] });
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [picklistSearch, setPicklistSearch] = useState('');
  const [mcWarning, setMcWarning] = useState(null);
  const [unlockCode, setUnlockCode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resFields, resSettings] = await Promise.all([
        apiFetch('/api/fields').then(r => r.json()).catch(() => []),
        apiFetch('/api/dashboardSettings').then(r => r.json()).catch(() => ({}))
      ]);

      if (Array.isArray(resFields)) setFields(resFields);
      if (resSettings && !resSettings.error) setDashboardSettings(resSettings);
    } catch (err) {
      console.error('Failed to load admin settings:', err);
      toast.error('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddingField(true);

    try {
      const res = await apiFetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          fieldType: newType,
          entityType: activeTab === 'burndown' ? 'burndown' : 'risk',
          required: newRequired
        })
      });
      if (!res.ok) throw new Error('Failed to add field');
      const field = await res.json();
      setFields(prev => [...prev, field]);
      setNewName('');
      setNewType('text');
      setNewRequired(false);
      toast.success(`Custom field "${field.name}" created successfully`);
    } catch (err) {
      toast.error(err.message || 'Error creating custom field');
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteField = async (id) => {
    try {
      const res = await apiFetch(`/api/fields/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete field');
      setFields(prev => prev.filter(f => f.id !== id));
      toast.success('Custom field deleted');
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete field');
    }
  };

  const handleToggleDashboardField = async (fieldName) => {
    setSavingSettings(true);
    try {
      const isHidden = dashboardSettings.hiddenFields?.includes(fieldName);
      const newHiddenFields = isHidden
        ? dashboardSettings.hiddenFields.filter(f => f !== fieldName)
        : [...(dashboardSettings.hiddenFields || []), fieldName];

      const newSettings = { ...dashboardSettings, hiddenFields: newHiddenFields };
      setDashboardSettings(newSettings);

      const res = await apiFetch('/api/dashboardSettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error('Failed to update modal fields');
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBulkToggleModalFields = async (showAll) => {
    setSavingSettings(true);
    try {
      const allFieldIds = [
        'level', 'gpocs', 'cpocs', 'discoveredDate', 'approvedDate', 'closedDate',
        'impactStatement', 'impactCost', 'impactSchedule', 'impactPerformance',
        'isSpof', 'resourceCostNeeded', 'resourceScheduleNeeded', 'planRealism',
        ...fields.filter(f => f.entityType === 'risk').map(f => `custom_${f.name}`)
      ];

      const newHiddenFields = showAll ? [] : allFieldIds;
      const newSettings = { ...dashboardSettings, hiddenFields: newHiddenFields };
      setDashboardSettings(newSettings);

      await apiFetch('/api/dashboardSettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      window.dispatchEvent(new CustomEvent('settings-updated'));
      toast.success(showAll ? 'All modal fields enabled' : 'All optional fields hidden');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    const code = unlockCode.trim();
    let keysToUnlock = [];
    
    if (code === 'Schedule') keysToUnlock = ['schedule'];
    else if (code === 'Monte') keysToUnlock = ['monteCarlo'];
    else if (code === 'Brief') keysToUnlock = ['briefing', 'briefingAdmin'];
    else {
      toast.error('Invalid unlock code');
      return;
    }
    
    try {
      const currentUnlocked = dashboardSettings.unlockedModules || ['rio'];
      if (keysToUnlock.every(k => currentUnlocked.includes(k))) {
        toast.error('Module is already unlocked');
        return;
      }
      
      const newUnlocked = [...new Set([...currentUnlocked, ...keysToUnlock])];
      
      // Auto-enable them in navigation when they are first unlocked
      const newEnabled = { ...(dashboardSettings.enabledModules || {}) };
      keysToUnlock.forEach(k => {
         if (newEnabled[k] === undefined) newEnabled[k] = true;
      });

      const newSettings = { ...dashboardSettings, unlockedModules: newUnlocked, enabledModules: newEnabled };
      setDashboardSettings(newSettings);
      
      await apiFetch('/api/dashboardSettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      window.dispatchEvent(new CustomEvent('settings-updated'));
      toast.success('Module unlocked successfully');
      setUnlockCode('');
    } catch (err) {
      toast.error('Failed to unlock module');
    }
  };

  const handleToggleModule = async (modKey, isEnabled, modLabel) => {
    const targetState = !isEnabled;
    try {
      const newModules = { ...(dashboardSettings.enabledModules || {}), [modKey]: targetState };
      const newSettings = { ...dashboardSettings, enabledModules: newModules };
      setDashboardSettings(newSettings);
      
      await apiFetch('/api/dashboardSettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      window.dispatchEvent(new CustomEvent('settings-updated'));
      toast.success(`${modLabel} ${targetState ? 'enabled' : 'hidden'}`);
    } catch (err) {
      toast.error('Failed to update module settings');
    }
  };

  const handleSavePicklist = async (key, updatedPicklist) => {
    setSavingSettings(true);
    try {
      const newSettings = {
        ...dashboardSettings,
        picklists: {
          ...(dashboardSettings.picklists || {}),
          [key]: updatedPicklist
        }
      };
      setDashboardSettings(newSettings);
      const res = await apiFetch('/api/dashboardSettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error('Failed to save picklist');
      window.dispatchEvent(new CustomEvent('settings-updated'));
      toast.success('Picklist updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const riskFields = fields.filter(f => f.entityType === 'risk');
  const burndownFields = fields.filter(f => f.entityType === 'burndown');
  const currentFields = activeTab === 'risk' ? riskFields : burndownFields;
  const filteredFields = currentFields.filter(f => 
    f.name.toLowerCase().includes(fieldSearch.toLowerCase()) || 
    f.fieldType.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const picklistKeys = [
    { key: 'level', label: 'Level', category: 'Standard Field' },
    { key: 'riskCategory', label: 'Risk Category', category: 'Standard Field' },
    { key: 'handlingStrategy', label: 'Handling Strategy', category: 'Standard Field' },
    ...fields.filter(f => f.fieldType === 'picklist').map(f => ({ 
      key: `custom_${f.name}`, 
      label: f.name, 
      category: `Custom Field (${f.entityType === 'burndown' ? 'Burndown' : 'Risk'})` 
    }))
  ];

  const filteredPicklists = picklistKeys.filter(p => 
    p.label.toLowerCase().includes(picklistSearch.toLowerCase()) || 
    p.category.toLowerCase().includes(picklistSearch.toLowerCase())
  );

  const validateProbabilityMapping = (mapping) => {
    for (let i = 1; i <= 5; i++) {
      const cur = mapping[i] || { min: 0, max: 0 };
      if (cur.min < 0 || cur.max > 100) return `Score ${i} range must be between 0% and 100%.`;
      if (cur.min > cur.max) return `Score ${i}: Min (${cur.min}%) cannot exceed Max (${cur.max}%).`;
      if (i > 1) {
        const prev = mapping[i - 1] || { min: 0, max: 0 };
        if (cur.min <= prev.max) {
          return `Score ${i} Min (${cur.min}%) must be greater than Score ${i - 1} Max (${prev.max}%) to prevent distribution overlap.`;
        }
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RefreshCw size={32} className="spin" color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading administration configuration...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      
      {/* Header Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.75rem', 
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.4) 100%)', 
            border: '1px solid rgba(99, 102, 241, 0.4)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 16px var(--primary-glow)'
          }}>
            <Settings size={22} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Administration & Settings
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Manage system modules, custom fields, simulation models, and workflow configuration
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.4rem 0.85rem', 
            background: 'rgba(15, 23, 42, 0.75)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            fontSize: '0.8rem' 
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Custom Fields:</span>
            <strong style={{ color: 'var(--text)' }}>{fields.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left Navigation Sidebar */}
        <div style={{ 
          background: 'var(--surface)', 
          borderRadius: '12px', 
          border: '1px solid var(--glass-border)', 
          padding: '1rem',
          boxShadow: 'var(--shadow-md)',
          position: 'sticky',
          top: '75px'
        }}>
          {NAV_TABS.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: gIdx < NAV_TABS.length - 1 ? '1.25rem' : 0 }}>
              <div style={{ 
                fontSize: '0.68rem', 
                fontWeight: 700, 
                letterSpacing: '0.08em', 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                marginBottom: '0.45rem',
                paddingLeft: '0.5rem'
              }}>
                {group.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {group.tabs.filter(tab => {
                  const currentUnlocked = dashboardSettings.unlockedModules || ['rio'];
                  if (tab.id === 'montecarlo' && !currentUnlocked.includes('monteCarlo')) return false;
                  if (tab.id === 'calendar' && !currentUnlocked.includes('schedule')) return false;
                  return true;
                }).map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: isActive ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
                        background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.08) 100%)' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        width: '100%'
                      }}
                    >
                      <div style={{ 
                        color: isActive ? 'var(--primary)' : 'var(--text-muted)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Icon size={17} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tab.label}
                        </div>
                      </div>
                      {tab.id === 'risk' && riskFields.length > 0 && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {riskFields.length}
                        </span>
                      )}
                      {tab.id === 'burndown' && burndownFields.length > 0 && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {burndownFields.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Content Area */}
        <div style={{ minWidth: 0 }}>

          {/* TAB 1: PAGES & MODULES */}
          {activeTab === 'modules' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                    Workspace Pages & Navigation Modules
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Control which core feature modules and views are enabled in the top navigation bar.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  {
                    key: 'rio',
                    label: 'Risk, Issue & Opportunity (RIO) Management',
                    description: 'Enterprise dashboard, interactive 5x5 matrices, burndown step charts, and data tables.',
                    icon: Shield,
                    color: '#6366F1'
                  },
                  {
                    key: 'schedule',
                    label: 'Schedule & Critical Path View',
                    description: 'Interactive Gantt chart, CPM network path, MS Project (.mpp) import, and task linkage.',
                    icon: CalendarClock,
                    color: '#06B6D4'
                  },
                  {
                    key: 'monteCarlo',
                    label: 'Monte Carlo Analysis Engine',
                    description: 'Quantitative probabilistic simulations evaluating cost, schedule uncertainty, and P50/P80 percentiles.',
                    icon: TrendingUp,
                    color: '#10B981'
                  },
                  {
                    key: 'briefing',
                    label: 'Briefing Presentation Deck',
                    description: 'Executive slide deck view for high-level briefings and stakeholder reviews.',
                    icon: Presentation,
                    color: '#EC4899'
                  },
                  {
                    key: 'briefingAdmin',
                    label: 'Briefing Layout Builder',
                    description: 'Visual drag-and-drop canvas to customize widgets and choose specific RIO items for briefing.',
                    icon: Layout,
                    color: '#F59E0B'
                  }
                ].filter(mod => {
                  const currentUnlocked = dashboardSettings.unlockedModules || ['rio'];
                  return currentUnlocked.includes(mod.key);
                }).map(mod => {
                  const isEnabled = dashboardSettings.enabledModules?.[mod.key] ?? (mod.key === 'rio');
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.15rem 1.25rem',
                        background: isEnabled ? 'rgba(15, 23, 42, 0.65)' : 'rgba(15, 23, 42, 0.3)',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isEnabled ? 'rgba(255, 255, 255, 0.12)' : 'var(--border)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, paddingRight: '1rem' }}>
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '8px', 
                          background: isEnabled ? `${mod.color}22` : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isEnabled ? `${mod.color}44` : 'transparent'}`,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: isEnabled ? mod.color : 'var(--text-muted)'
                        }}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.975rem', color: isEnabled ? 'var(--text)' : 'var(--text-muted)' }}>
                              {mod.label}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: isEnabled ? 'var(--success)' : 'var(--text-muted)',
                              border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`
                            }}>
                              {isEnabled ? 'Live in Navigation' : 'Hidden'}
                            </span>
                          </div>
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleModule(mod.key, isEnabled, mod.label)}
                        style={{
                          background: isEnabled ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                          border: 'none',
                          borderRadius: '20px',
                          width: '48px',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '3px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          justifyContent: isEnabled ? 'flex-end' : 'flex-start'
                        }}
                        title={`Click to ${isEnabled ? 'hide' : 'enable'} ${mod.label}`}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>Unlock Module</h3>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Enter an unlock code to reveal additional hidden modules.
                </p>
                <form 
                  onSubmit={handleUnlockSubmit} 
                  style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    value={unlockCode}
                    onChange={(e) => setUnlockCode(e.target.value)}
                    placeholder="Enter unlock code..."
                    className="form-input"
                    style={{ flex: 1, maxWidth: '300px' }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!unlockCode.trim()}>
                    Unlock
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: CUSTOM FIELDS (RISK & BURNDOWN) */}
          {(activeTab === 'risk' || activeTab === 'burndown') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Add New Field Card */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <PlusCircle size={18} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                    Add {activeTab === 'risk' ? 'Risk' : 'Burndown Step'} Custom Field
                  </h3>
                </div>

                <form onSubmit={handleAddField} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                    <div>
                      <label className="form-label">Field Label / Name</label>
                      <input
                        required
                        type="text"
                        className="form-input"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Work Package, IPT Lead, Subcontractor"
                      />
                    </div>
                    <div>
                      <label className="form-label">Data Type</label>
                      <select 
                        className="form-input" 
                        value={newType} 
                        onChange={e => setNewType(e.target.value)}
                      >
                        {FIELD_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label} ({t.desc})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Requirement</label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        cursor: 'pointer', 
                        marginTop: '0.6rem',
                        fontSize: '0.875rem' 
                      }}>
                        <input
                          type="checkbox"
                          checked={newRequired}
                          onChange={e => setNewRequired(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        />
                        <span>Mandatory</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={addingField}>
                      <Plus size={16} style={{ marginRight: '6px' }} />
                      {addingField ? 'Adding Field...' : 'Create Custom Field'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Defined Fields List */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                      Defined {activeTab === 'risk' ? 'Risk' : 'Burndown'} Fields ({currentFields.length})
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      These attributes will be available in the {activeTab === 'risk' ? 'RIO editor modal' : 'mitigation burndown plan'}.
                    </p>
                  </div>

                  {currentFields.length > 0 && (
                    <div style={{ position: 'relative', width: '220px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '30px', fontSize: '0.825rem' }}
                        placeholder="Filter fields..."
                        value={fieldSearch}
                        onChange={e => setFieldSearch(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {currentFields.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                    <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No custom fields defined yet</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      Use the form above to add custom attributes tailored to your project.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {filteredFields.map(field => (
                      <div
                        key={field.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.85rem 1.15rem',
                          background: 'rgba(15, 23, 42, 0.5)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          transition: 'border-color 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{field.name}</span>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: field.fieldType === 'picklist' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: field.fieldType === 'picklist' ? 'var(--primary-hover)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            border: '1px solid var(--border-light)'
                          }}>
                            {field.fieldType}
                          </span>
                          {field.required && (
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: 'var(--danger)',
                              fontWeight: 600,
                              border: '1px solid rgba(244, 63, 94, 0.3)'
                            }}>
                              Required
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => setConfirmDeleteId(field.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s ease'
                          }}
                          title="Delete Field"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PICKLISTS & DROPDOWNS */}
          {activeTab === 'picklists' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                    Configure Picklist & Dropdown Options
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Manage the selectable choice chips for standard attributes and custom picklist fields.
                  </p>
                </div>

                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '30px', fontSize: '0.825rem' }}
                    placeholder="Search picklists..."
                    value={picklistSearch}
                    onChange={e => setPicklistSearch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {filteredPicklists.map(item => {
                  const pl = dashboardSettings.picklists?.[item.key] || { options: [], isMultiSelect: false };
                  return (
                    <div
                      key={item.key}
                      style={{
                        padding: '1.25rem',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.45)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--primary-hover)' }}>
                              {item.label}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.category}
                            </span>
                          </div>
                        </div>

                        {/* Multi-Select Toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={pl.isMultiSelect}
                            onChange={(e) => handleSavePicklist(item.key, { ...pl, isMultiSelect: e.target.checked })}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontWeight: 600, color: pl.isMultiSelect ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {pl.isMultiSelect ? 'Multi-select Enabled' : 'Single Selection Only'}
                          </span>
                        </label>
                      </div>

                      {/* Option Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', minHeight: '32px' }}>
                        {pl.options.map((opt, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.3rem 0.75rem',
                              background: 'rgba(15, 23, 42, 0.8)',
                              borderRadius: '16px',
                              border: '1px solid var(--border)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span>{opt}</span>
                            <button
                              onClick={() => {
                                const newOpts = pl.options.filter((_, idx) => idx !== i);
                                handleSavePicklist(item.key, { ...pl, options: newOpts });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Remove option"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        {pl.options.length === 0 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                            No options defined yet. Add choices below.
                          </span>
                        )}
                      </div>

                      {/* Quick Add Input */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Type option and press Enter..."
                          style={{ fontSize: '0.85rem' }}
                          id={`new-opt-${item.key}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.target.value.trim();
                              if (val && !pl.options.includes(val)) {
                                handleSavePicklist(item.key, { ...pl, options: [...pl.options, val] });
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn"
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={() => {
                            const input = document.getElementById(`new-opt-${item.key}`);
                            const val = input.value.trim();
                            if (val && !pl.options.includes(val)) {
                              handleSavePicklist(item.key, { ...pl, options: [...pl.options, val] });
                              input.value = '';
                            }
                          }}
                        >
                          <Plus size={14} style={{ marginRight: '4px' }} />
                          Add Option
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: DASHBOARD & MODAL VIEW CONFIG */}
          {activeTab === 'dashboard' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                    Configure Risk Details Modal Fields
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Choose which sections and fields appear when viewing an item in the Risk Details Modal.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => handleBulkToggleModalFields(true)}
                  >
                    <Eye size={14} style={{ marginRight: '4px' }} />
                    Show All
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => handleBulkToggleModalFields(false)}
                  >
                    <EyeOff size={14} style={{ marginRight: '4px' }} />
                    Hide All
                  </button>
                </div>
              </div>

              {/* Grouped Field Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {[
                  { id: 'level', label: 'Program / Internal Level', group: 'Core Information' },
                  { id: 'gpocs', label: 'Government POCs (GPOCs)', group: 'Ownership' },
                  { id: 'cpocs', label: 'Contractor POCs (CPOCs)', group: 'Ownership' },
                  { id: 'discoveredDate', label: 'Discovered Date', group: 'Milestones' },
                  { id: 'approvedDate', label: 'Approved Date', group: 'Milestones' },
                  { id: 'closedDate', label: 'Closed Date', group: 'Milestones' },
                  { id: 'impactStatement', label: 'General Impact Statement', group: 'Impacts' },
                  { id: 'impactCost', label: 'Cost Impact Details', group: 'Impacts' },
                  { id: 'impactSchedule', label: 'Schedule Impact Details', group: 'Impacts' },
                  { id: 'impactPerformance', label: 'Performance Impact Details', group: 'Impacts' },
                  { id: 'isSpof', label: 'Single Point of Failure (SPoF)', group: 'Safeguards' },
                  { id: 'resourceCostNeeded', label: 'Resource Cost Needed', group: 'Planning' },
                  { id: 'resourceScheduleNeeded', label: 'Resource Schedule Needed', group: 'Planning' },
                  { id: 'planRealism', label: 'Plan Realism Confidence', group: 'Planning' },
                  ...riskFields.map(f => ({ id: `custom_${f.name}`, label: `${f.name} (Custom)`, group: 'Custom Fields' }))
                ].map(field => {
                  const isVisible = !dashboardSettings.hiddenFields?.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        background: isVisible ? 'rgba(15, 23, 42, 0.6)' : 'rgba(15, 23, 42, 0.25)',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: isVisible ? 'rgba(99, 102, 241, 0.3)' : 'var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isVisible ? 'var(--text)' : 'var(--text-muted)' }}>
                          {field.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {field.group}
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => handleToggleDashboardField(field.id)}
                        disabled={savingSettings}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: MONTE CARLO CALIBRATION */}
          {activeTab === 'montecarlo' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                    Monte Carlo Probability Calibration
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Map qualitative 1–5 likelihood scores to quantitative percentage bounds for probabilistic modeling.
                  </p>
                </div>

                <button
                  className="btn"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => {
                    const defaultMapping = {
                      1: { min: 1, max: 20 },
                      2: { min: 21, max: 40 },
                      3: { min: 41, max: 60 },
                      4: { min: 61, max: 80 },
                      5: { min: 81, max: 99 }
                    };
                    setDashboardSettings({ ...dashboardSettings, probabilityMapping: defaultMapping });
                    setMcWarning(null);
                    toast.success('Reset to standard probability distribution');
                  }}
                >
                  <RefreshCw size={14} style={{ marginRight: '6px' }} />
                  Reset to Defaults
                </button>
              </div>

              {/* Spectrum Visualizer */}
              <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Probability Spectrum Bands (0% – 100%)
                </div>
                <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.4)' }}>
                  {[
                    { score: 1, color: '#10B981', label: '1: Very Low' },
                    { score: 2, color: '#3B82F6', label: '2: Low' },
                    { score: 3, color: '#F59E0B', label: '3: Moderate' },
                    { score: 4, color: '#F97316', label: '4: High' },
                    { score: 5, color: '#EF4444', label: '5: Critical' }
                  ].map(item => {
                    const mapping = dashboardSettings.probabilityMapping?.[item.score] || { min: 0, max: 0 };
                    const widthPct = Math.max(0, mapping.max - mapping.min);
                    return (
                      <div
                        key={item.score}
                        style={{
                          width: `${widthPct}%`,
                          background: item.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          transition: 'width 0.2s ease',
                          opacity: 0.85
                        }}
                        title={`${item.label}: ${mapping.min}% – ${mapping.max}%`}
                      >
                        {widthPct >= 10 ? `S${item.score} (${mapping.min}-${mapping.max}%)` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Range Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '520px', marginBottom: '2rem' }}>
                {[
                  { score: 1, title: 'Score 1 (Very Low / Remote)', color: 'var(--success)' },
                  { score: 2, title: 'Score 2 (Low / Unlikely)', color: 'var(--info)' },
                  { score: 3, title: 'Score 3 (Moderate / Possible)', color: 'var(--warning)' },
                  { score: 4, title: 'Score 4 (High / Likely)', color: '#F97316' },
                  { score: 5, title: 'Score 5 (Critical / Near Certain)', color: 'var(--danger)' }
                ].map(item => (
                  <div
                    key={item.score}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }}></span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        style={{ width: '70px', padding: '0.35rem 0.5rem', textAlign: 'center' }}
                        value={dashboardSettings.probabilityMapping?.[item.score]?.min ?? 0}
                        onChange={(e) => {
                          const current = dashboardSettings.probabilityMapping?.[item.score] || { min: 0, max: 0 };
                          const newMapping = {
                            ...(dashboardSettings.probabilityMapping || {}),
                            [item.score]: { ...current, min: Number(e.target.value) }
                          };
                          setDashboardSettings({ ...dashboardSettings, probabilityMapping: newMapping });
                          setMcWarning(validateProbabilityMapping(newMapping));
                        }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>% to</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        style={{ width: '70px', padding: '0.35rem 0.5rem', textAlign: 'center' }}
                        value={dashboardSettings.probabilityMapping?.[item.score]?.max ?? 0}
                        onChange={(e) => {
                          const current = dashboardSettings.probabilityMapping?.[item.score] || { min: 0, max: 0 };
                          const newMapping = {
                            ...(dashboardSettings.probabilityMapping || {}),
                            [item.score]: { ...current, max: Number(e.target.value) }
                          };
                          setDashboardSettings({ ...dashboardSettings, probabilityMapping: newMapping });
                          setMcWarning(validateProbabilityMapping(newMapping));
                        }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
                    </div>
                  </div>
                ))}
              </div>

              {mcWarning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} />
                  <span>{mcWarning}</span>
                </div>
              )}

              <button
                className="btn btn-primary"
                disabled={savingSettings || !!mcWarning}
                onClick={async () => {
                  const mapping = dashboardSettings.probabilityMapping || {};
                  const err = validateProbabilityMapping(mapping);
                  if (err) {
                    toast.error(err);
                    return;
                  }

                  if (window.confirm('Recalibrating probability mapping will affect future Monte Carlo simulations. Proceed?')) {
                    setSavingSettings(true);
                    try {
                      const res = await apiFetch('/api/dashboardSettings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dashboardSettings)
                      });
                      if (!res.ok) throw new Error('Failed to save mapping');
                      window.dispatchEvent(new CustomEvent('settings-updated'));
                      toast.success('Monte Carlo probability calibration saved');
                    } catch (e) {
                      toast.error(e.message);
                    } finally {
                      setSavingSettings(false);
                    }
                  }
                }}
              >
                <Check size={16} style={{ marginRight: '6px' }} />
                {savingSettings ? 'Saving...' : 'Save Probability Calibration'}
              </button>
            </div>
          )}

          {/* TAB 7: WORK CALENDAR & HOLIDAYS */}
          {activeTab === 'calendar' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                  Work Calendar & Holiday Configuration
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Configure working days and non-working holidays utilized by the Gantt chart and Critical Path analysis.
                </p>
              </div>

              {/* Weekend Calculation Toggle */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1.25rem', 
                background: 'rgba(15, 23, 42, 0.45)', 
                borderRadius: '10px', 
                border: '1px solid var(--border)',
                marginBottom: '2rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Include Weekends in Task Durations</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    When enabled, Saturdays and Sundays count toward task working days. When disabled, standard 5-day work weeks apply.
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dashboardSettings.calendar?.includeWeekends || false}
                    onChange={async (e) => {
                      const newSettings = {
                        ...dashboardSettings,
                        calendar: { ...(dashboardSettings.calendar || {}), includeWeekends: e.target.checked }
                      };
                      setDashboardSettings(newSettings);
                      try {
                        await apiFetch('/api/dashboardSettings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(newSettings)
                        });
                        window.dispatchEvent(new CustomEvent('settings-updated'));
                        toast.success('Calendar schedule settings updated');
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: dashboardSettings.calendar?.includeWeekends ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {dashboardSettings.calendar?.includeWeekends ? '7-Day Week' : '5-Day Work Week'}
                  </span>
                </label>
              </div>

              {/* Holiday Manager */}
              <div>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 600 }}>
                  Project Non-Working Holidays ({dashboardSettings.calendar?.holidays?.length || 0})
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Dates added here are skipped during critical path and duration calculations.
                </p>

                {/* Add Holiday Form */}
                <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '380px', marginBottom: '1.25rem' }}>
                  <input
                    type="date"
                    id="new-holiday-input"
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      const input = document.getElementById('new-holiday-input');
                      if (!input.value) return;

                      const currentHols = dashboardSettings.calendar?.holidays || [];
                      if (currentHols.includes(input.value)) {
                        toast.error('Holiday date already added');
                        return;
                      }

                      const newSettings = {
                        ...dashboardSettings,
                        calendar: { ...(dashboardSettings.calendar || {}), holidays: [...currentHols, input.value].sort() }
                      };
                      setDashboardSettings(newSettings);
                      input.value = '';
                      try {
                        await apiFetch('/api/dashboardSettings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(newSettings)
                        });
                        window.dispatchEvent(new CustomEvent('settings-updated'));
                        toast.success('Holiday added');
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                  >
                    <Plus size={15} style={{ marginRight: '4px' }} />
                    Add Holiday
                  </button>
                </div>

                {/* Holiday Badge Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                  {(dashboardSettings.calendar?.holidays || []).map(hol => (
                    <div
                      key={hol}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.55rem 0.85rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{hol}</span>
                      </div>

                      <button
                        onClick={async () => {
                          const newHols = dashboardSettings.calendar.holidays.filter(h => h !== hol);
                          const newSettings = {
                            ...dashboardSettings,
                            calendar: { ...dashboardSettings.calendar, holidays: newHols }
                          };
                          setDashboardSettings(newSettings);
                          try {
                            await apiFetch('/api/dashboardSettings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(newSettings)
                            });
                            window.dispatchEvent(new CustomEvent('settings-updated'));
                            toast.success('Holiday removed');
                          } catch (err) {
                            toast.error(err.message);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remove Holiday"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(dashboardSettings.calendar?.holidays || []).length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      No holiday dates configured.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DATA EXPORT & DOCUMENTATION */}
          {activeTab === 'export' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                    Data Export & Schema Specifications
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Information on extracting structured data into CSV reports and external reporting tools.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('app-action', { detail: 'csv' }));
                    toast.success('Generating CSV export...');
                  }}
                >
                  <Download size={15} style={{ marginRight: '6px' }} />
                  Trigger CSV Export Now
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.45)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <FileSpreadsheet size={18} color="var(--primary)" />
                    <h4 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 600 }}>Live vs. Snapshot Export</h4>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.825rem', lineHeight: '1.5' }}>
                    When triggered from the active view, the export extracts all current active risks. When triggered while a historical snapshot is selected, the export extracts the risks exactly as they existed at that snapshot timestamp.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.45)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={18} color="var(--success)" />
                    <h4 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 600 }}>Custom Fields Included</h4>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.825rem', lineHeight: '1.5' }}>
                    All user-defined custom fields are dynamically appended as dedicated spreadsheet columns at the end of every CSV export file.
                  </p>
                </div>
              </div>

              {/* Schema Table */}
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.975rem', fontWeight: 600 }}>
                Standard Export Columns
              </h4>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Column Name</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Type</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Risk ID & Title', type: 'String', desc: 'Formatted ID (e.g. R-101) and full item title' },
                      { name: 'Level & Category', type: 'Picklist', desc: 'Program/Internal level and risk category tags' },
                      { name: 'Strategy & Score', type: 'Score', desc: 'Handling strategy and qualitative 1-25 risk score' },
                      { name: 'POCs & Owners', type: 'Text', desc: 'Government and contractor primary points of contact' },
                      { name: 'Action Plan', type: 'HTML/Text', desc: 'Mitigation plan and handling roadmap' },
                      { name: 'Burndown Steps', type: 'Text Series', desc: 'Chronological list of target & completed reduction milestones' },
                      { name: 'Custom Fields', type: 'Dynamic', desc: 'Any user-defined custom attributes' }
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < 6 ? '1px solid var(--border-light)' : 'none' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{row.type}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Field Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => handleDeleteField(confirmDeleteId)}
        title="Delete Custom Field Definition"
        message="Are you sure you want to delete this custom field? Existing values stored in individual risks will not be destroyed, but the field will no longer appear in forms or tables."
        confirmText="Delete Field"
      />
    </div>
  );
}
