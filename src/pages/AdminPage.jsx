import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Settings } from 'lucide-react';
import { apiFetch } from '../utils/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

const AdminPage = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('risk');

  // New field form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const res = await apiFetch('http://localhost:3000/api/fields');
      const data = await res.json();
      if (Array.isArray(data)) setFields(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom field definition? This will not remove data already saved.')) return;

    try {
      const res = await apiFetch(`http://localhost:3000/api/fields/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setFields(fields.filter(f => f.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const riskFields = fields.filter(f => f.entityType === 'risk');
  const burndownFields = fields.filter(f => f.entityType === 'burndown');
  const currentFields = activeTab === 'risk' ? riskFields : burndownFields;

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Settings size={28} color="var(--primary)" />
        <h2 style={{ margin: 0 }}>Admin — Custom Fields</h2>
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
            fontSize: '1rem',
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
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Burndown Fields ({burndownFields.length})
        </button>
      </div>

      {/* Existing Fields */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>
          {activeTab === 'risk' ? 'Risk' : 'Burndown Step'} Custom Fields
        </h3>

        {currentFields.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No custom fields defined yet for {activeTab === 'risk' ? 'risks' : 'burndown steps'}.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currentFields.map(field => (
              <div
                key={field.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{field.name}</span>
                  <span style={{
                    fontSize: '0.8rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--border)',
                    textTransform: 'capitalize'
                  }}>
                    {field.fieldType}
                  </span>
                  {field.required && (
                    <span style={{
                      fontSize: '0.8rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'var(--danger)',
                      color: '#fff'
                    }}>
                      Required
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(field.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                  title="Delete field"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Field */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add New {activeTab === 'risk' ? 'Risk' : 'Burndown'} Field</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Field Name</label>
              <input
                required
                type="text"
                className="form-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Owner, Department, Priority"
              />
            </div>
            <div>
              <label className="form-label">Field Type</label>
              <select
                className="form-input"
                value={newType}
                onChange={e => setNewType(e.target.value)}
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="required-check"
              checked={newRequired}
              onChange={e => setNewRequired(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            <label htmlFor="required-check" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Required field
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn" disabled={adding}>
              <PlusCircle size={16} style={{ marginRight: '6px' }} />
              {adding ? 'Adding...' : 'Add Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
