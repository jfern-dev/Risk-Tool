import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../utils/api';

const RiskFormModal = ({ onClose, onRiskAdded, initialRisk, onRiskUpdated, readOnly = false, customHeader = null }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [customValues, setCustomValues] = useState({});

  // Tab 1: General
  const [itemType, setItemType] = useState(initialRisk?.itemType || 'Risk');
  const [userRiskId, setUserRiskId] = useState(initialRisk?.userRiskId || '');
  const [title, setTitle] = useState(initialRisk?.title || '');
  const [level, setLevel] = useState(initialRisk?.level || 'Program');
  const [riskCategory, setRiskCategory] = useState(initialRisk?.riskCategory || 'Technical');
  const [handlingStrategy, setHandlingStrategy] = useState(initialRisk?.handlingStrategy || 'Mitigate/Execute');
  const [gpocs, setGpocs] = useState(initialRisk?.gpocs || '');
  const [cpocs, setCpocs] = useState(initialRisk?.cpocs || '');

  const [discoveredDate, setDiscoveredDate] = useState(initialRisk?.discoveredDate || '');
  const [approvedDate, setApprovedDate] = useState(initialRisk?.approvedDate || '');
  const [closedDate, setClosedDate] = useState(initialRisk?.closedDate || '');

  // Tab 2: Details & Impact
  const [description, setDescription] = useState(initialRisk?.description || '');
  const [impactStatement, setImpactStatement] = useState(initialRisk?.impactStatement || '');
  const [impactCost, setImpactCost] = useState(initialRisk?.impactCost || '');
  const [impactSchedule, setImpactSchedule] = useState(initialRisk?.impactSchedule || '');
  const [impactPerformance, setImpactPerformance] = useState(initialRisk?.impactPerformance || '');
  const [isSpof, setIsSpof] = useState(initialRisk?.isSpof || false);
  const [spofDescription, setSpofDescription] = useState(initialRisk?.spofDescription || '');
  const [likelihood, setLikelihood] = useState(initialRisk?.likelihood || 3);
  const [impact, setImpact] = useState(initialRisk?.impact || 3);

  // Tab 3: Resources
  const [resourceCostNeeded, setResourceCostNeeded] = useState(initialRisk?.resourceCostNeeded || '');
  const [resourceScheduleNeeded, setResourceScheduleNeeded] = useState(initialRisk?.resourceScheduleNeeded || '');
  const [planRealism, setPlanRealism] = useState(initialRisk?.planRealism || '');

  useEffect(() => {
    apiFetch('http://localhost:3000/api/fields/risk')
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) {
          setFieldDefs(data);
          if (initialRisk && initialRisk.customFields) {
            const initialCustoms = {};
            initialRisk.customFields.forEach(cf => {
              initialCustoms[cf.name] = cf.value;
            });
            setCustomValues(initialCustoms);
          }
        } 
      })
      .catch(console.error);
  }, [initialRisk]);

  const handleCustomChange = (name, value) => {
    setCustomValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const finalLikelihood = itemType === 'Issue' ? 5 : likelihood;

    const newRiskPayload = {
      itemType, userRiskId, title, level, riskCategory, handlingStrategy,
      gpocs, cpocs, description, impactStatement, impactCost,
      impactSchedule, impactPerformance, isSpof, spofDescription,
      likelihood: finalLikelihood, impact, resourceCostNeeded, resourceScheduleNeeded,
      planRealism,
      discoveredDate, approvedDate, closedDate
    };

    try {
      const isEdit = !!initialRisk;
      const endpoint = isEdit ? `http://localhost:3000/api/risks/${initialRisk.id}` : 'http://localhost:3000/api/risks';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRiskPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} risk`);
      }

      const savedRisk = await response.json();

      const customEntries = fieldDefs
        .filter(f => customValues[f.name] !== undefined && customValues[f.name] !== '')
        .map(f => ({ name: f.name, value: customValues[f.name] }));

      if (customEntries.length > 0 || isEdit) {
        const cfRes = await apiFetch(`http://localhost:3000/api/risks/${savedRisk.id}/custom-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: customEntries })
        });
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          if (cfData && cfData.customFields) {
            savedRisk.customFields = cfData.customFields;
          } else if (customEntries.length > 0) {
            savedRisk.customFields = customEntries.map((f, i) => ({ id: i, ...f, riskId: savedRisk.id }));
          }
        }
      }

      if (isEdit) {
        onRiskUpdated(savedRisk);
      } else {
        onRiskAdded(savedRisk);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error saving risk.');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (tabId) => ({
    padding: '0.75rem 1.5rem',
    background: activeTab === tabId ? 'var(--primary)' : 'transparent',
    color: activeTab === tabId ? '#fff' : 'var(--text-muted)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontWeight: 600,
    flex: 1
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          {customHeader ? customHeader : <h2 style={{ margin: 0 }}>{initialRisk ? (readOnly ? 'View' : 'Edit') : 'Add New'} R/I/O</h2>}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tab Header */}
        <div style={{ display: 'flex', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden' }}>
          <button type="button" onClick={() => setActiveTab('general')} style={{ ...tabStyle('general'), borderRight: 'none' }}>1. General</button>
          <button type="button" onClick={() => setActiveTab('details')} style={{ ...tabStyle('details'), borderRight: 'none' }}>2. Details & Impact</button>
          <button type="button" onClick={() => setActiveTab('resources')} style={tabStyle('resources')}>3. Resources</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* TAB 1: GENERAL */}
          <div style={{ display: activeTab === 'general' ? 'flex' : 'none', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={itemType} onChange={e => setItemType(e.target.value)}>
                  <option value="Risk">Risk</option>
                  <option value="Issue">Issue</option>
                  <option value="Opportunity">Opportunity</option>
                </select>
              </div>
              <div>
                <label className="form-label">ID</label>
                <input required type="text" className="form-input" value={userRiskId} onChange={e => setUserRiskId(e.target.value)} placeholder="e.g. IT-001" />
              </div>
              <div>
                <label className="form-label">Title</label>
                <input required type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Breach" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Level</label>
                <select className="form-input" value={level} onChange={e => setLevel(e.target.value)}>
                  <option>Program</option>
                  <option>Internal</option>
                </select>
              </div>
              <div>
                <label className="form-label">Category</label>
                <select className="form-input" value={riskCategory} onChange={e => setRiskCategory(e.target.value)}>
                  <option>Schedule</option>
                  <option>Cost</option>
                  <option>Technical</option>
                </select>
              </div>
              <div>
                <label className="form-label">Handling Strategy</label>
                <select className="form-input" value={handlingStrategy} onChange={e => setHandlingStrategy(e.target.value)}>
                  <option>Accept</option>
                  <option>Decline</option>
                  <option>Transfer</option>
                  <option>Mitigate/Execute</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">GPOCs (comma separated)</label>
                <input type="text" className="form-input" value={gpocs} onChange={e => setGpocs(e.target.value)} placeholder="e.g. John Doe, Jane Smith" />
              </div>
              <div>
                <label className="form-label">CPOCs (comma separated)</label>
                <input type="text" className="form-input" value={cpocs} onChange={e => setCpocs(e.target.value)} placeholder="e.g. Acme Corp POC" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Discovered Date</label>
                <input type="date" className="form-input" value={discoveredDate} onChange={e => setDiscoveredDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Approved Date</label>
                <input type="date" className="form-input" value={approvedDate} onChange={e => setApprovedDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Closed Date</label>
                <input type="date" className="form-input" value={closedDate} onChange={e => setClosedDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* TAB 2: DETAILS & IMPACT */}
          <div style={{ display: activeTab === 'details' ? 'flex' : 'none', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Description (Risk/Issue/Opportunity)</label>
              <textarea className="form-input" rows="3" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="form-label">General Impact Statement</label>
              <textarea className="form-input" rows="2" value={impactStatement} onChange={e => setImpactStatement(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Impact on Cost</label>
                <input type="text" className="form-input" value={impactCost} onChange={e => setImpactCost(e.target.value)} placeholder="Material $ or hours" />
              </div>
              <div>
                <label className="form-label">Impact on Schedule</label>
                <input type="text" className="form-input" value={impactSchedule} onChange={e => setImpactSchedule(e.target.value)} placeholder="Days/Weeks lost" />
              </div>
              <div>
                <label className="form-label">Impact on Performance</label>
                <input type="text" className="form-input" value={impactPerformance} onChange={e => setImpactPerformance(e.target.value)} placeholder="Loss or gain" />
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isSpof ? '1rem' : '0' }}>
                <input type="checkbox" id="spof" checked={isSpof} onChange={e => setIsSpof(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                <label htmlFor="spof" style={{ fontWeight: 600 }}>This is a Single Point of Failure (SPoF)</label>
              </div>
              {isSpof && (
                <div>
                  <label className="form-label">Why is this a SPoF?</label>
                  <input type="text" className="form-input" value={spofDescription} onChange={e => setSpofDescription(e.target.value)} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: itemType === 'Issue' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              {itemType !== 'Issue' && (
                <div>
                  <label className="form-label">Likelihood (1-5)</label>
                  <input required type="number" min="1" max="5" className="form-input" value={likelihood} onChange={e => setLikelihood(Number(e.target.value))} />
                </div>
              )}
              <div>
                <label className="form-label">Consequence / Impact (1-5)</label>
                <input required type="number" min="1" max="5" className="form-input" value={impact} onChange={e => setImpact(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* TAB 3: RESOURCES */}
          <div style={{ display: activeTab === 'resources' ? 'flex' : 'none', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Resource Cost Needed</label>
                <input type="text" className="form-input" value={resourceCostNeeded} onChange={e => setResourceCostNeeded(e.target.value)} placeholder="Material $ / Labor hours" />
              </div>
              <div>
                <label className="form-label">Resource Schedule Needed</label>
                <input type="text" className="form-input" value={resourceScheduleNeeded} onChange={e => setResourceScheduleNeeded(e.target.value)} placeholder="Days / Weeks needed" />
              </div>
            </div>
            <div>
              <label className="form-label">Plan Realism</label>
              <textarea className="form-input" rows="2" value={planRealism} onChange={e => setPlanRealism(e.target.value)} placeholder="How realistic is the plan?" />
            </div>

            {/* Admin-defined custom fields */}
            {fieldDefs.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Additional Admin Fields</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {fieldDefs.map(field => (
                    <div key={field.id}>
                      <label className="form-label">{field.name} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                      <input
                        type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                        className="form-input" required={field.required}
                        value={customValues[field.name] || ''} onChange={e => handleCustomChange(field.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </fieldset>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', marginRight: '1rem' }}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save R/I/O'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RiskFormModal;
