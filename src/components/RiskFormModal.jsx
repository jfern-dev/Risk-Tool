import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../utils/api';

const RiskFormModal = ({ onClose, onRiskAdded }) => {
  const [userRiskId, setUserRiskId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [loading, setLoading] = useState(false);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [customValues, setCustomValues] = useState({});

  useEffect(() => {
    apiFetch('http://localhost:3000/api/fields/risk')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setFieldDefs(data); })
      .catch(console.error);
  }, []);

  const handleCustomChange = (name, value) => {
    setCustomValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('http://localhost:3000/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRiskId, title, description, likelihood, impact })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create risk');
      }

      const newRisk = await response.json();

      // Save custom field values if any are defined
      const customEntries = fieldDefs
        .filter(f => customValues[f.name] !== undefined && customValues[f.name] !== '')
        .map(f => ({ name: f.name, value: customValues[f.name] }));

      if (customEntries.length > 0) {
        await apiFetch(`http://localhost:3000/api/risks/${newRisk.id}/custom-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: customEntries })
        });
        newRisk.customFields = customEntries.map((f, i) => ({ id: i, ...f, riskId: newRisk.id }));
      }

      onRiskAdded(newRisk);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error creating risk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Add New Risk</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Risk ID</label>
              <input required type="text" className="form-input" value={userRiskId}
                onChange={e => setUserRiskId(e.target.value)} placeholder="e.g. IT-001" />
            </div>
            <div>
              <label className="form-label">Title</label>
              <input required type="text" className="form-input" value={title}
                onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Breach" />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows="3" value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Describe the risk..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Likelihood (1-5)</label>
              <input required type="number" min="1" max="5" className="form-input" value={likelihood}
                onChange={e => setLikelihood(Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Impact (1-5)</label>
              <input required type="number" min="1" max="5" className="form-input" value={impact}
                onChange={e => setImpact(Number(e.target.value))} />
            </div>
          </div>

          {/* Admin-defined custom fields */}
          {fieldDefs.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Additional Fields</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {fieldDefs.map(field => (
                  <div key={field.id}>
                    <label className="form-label">
                      {field.name} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <input
                      type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                      className="form-input"
                      required={field.required}
                      value={customValues[field.name] || ''}
                      onChange={e => handleCustomChange(field.name, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn"
              style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', marginRight: '1rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create Risk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RiskFormModal;
