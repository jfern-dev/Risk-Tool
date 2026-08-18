import React, { useState } from 'react';
import { X, CheckCircle, Pencil, Save } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';

const StepRow = ({ step, riskId, onStepUpdated, onComplete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(step.description);
  const [editTargetDate, setEditTargetDate] = useState(step.targetDate ? step.targetDate.substring(0, 10) : '');
  const [editAssignees, setEditAssignees] = useState(step.assignees || '');
  const [editLikelihoodReduction, setEditLikelihoodReduction] = useState(step.likelihoodReduction || 0);
  const [editImpactReduction, setEditImpactReduction] = useState(step.impactReduction || 0);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiFetch(`http://localhost:3000/api/risks/${riskId}/burndown/${step.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDesc,
          targetDate: editTargetDate,
          assignees: editAssignees,
          likelihoodReduction: editLikelihoodReduction,
          impactReduction: editImpactReduction
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update');
      }
      const updated = await response.json();
      onStepUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (step.isCompleted) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid var(--border)', opacity: 0.7 }}>
        <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} color="var(--success)" />
          <span style={{ textDecoration: 'line-through' }}>{step.description}</span>
        </h4>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Target: {new Date(step.targetDate).toLocaleDateString()}</span>
          {step.completedAt && <span>Actual: {new Date(step.completedAt).toLocaleDateString()}</span>}
          <span>Assignees: {step.assignees}</span>
          <span>Probability Red.: {step.likelihoodReduction || 0}</span>
          <span>Consequence Red.: {step.impactReduction || 0}</span>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" className="form-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ padding: '0.35rem 0.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Target Date</label>
              <input type="date" className="form-input" value={editTargetDate} onChange={e => setEditTargetDate(e.target.value)} style={{ padding: '0.35rem 0.5rem' }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Assignees</label>
              <input type="text" className="form-input" value={editAssignees} onChange={e => setEditAssignees(e.target.value)} style={{ padding: '0.35rem 0.5rem' }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>L Reduction</label>
              <input type="number" min="0" max="5" className="form-input" value={editLikelihoodReduction} onChange={e => setEditLikelihoodReduction(Number(e.target.value))} style={{ padding: '0.35rem 0.5rem' }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>I Reduction</label>
              <input type="number" min="0" max="5" className="form-input" value={editImpactReduction} onChange={e => setEditImpactReduction(Number(e.target.value))} style={{ padding: '0.35rem 0.5rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsEditing(false)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>Cancel</button>
            <button onClick={handleSave} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} disabled={saving}>
              <Save size={14} style={{ marginRight: '4px' }} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>{step.description}</h4>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>Target: {new Date(step.targetDate).toLocaleDateString()}</span>
            <span>Assignees: {step.assignees}</span>
            <span>P Reduction: {step.likelihoodReduction || 0}</span>
            <span>C Reduction: {step.impactReduction || 0}</span>
          </div>
          {step.impactOnConsequence && (
            <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
              <strong>Impact on Consequence:</strong> {step.impactOnConsequence}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsEditing(true)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <Pencil size={14} style={{ marginRight: '4px' }} /> Edit
          </button>
          <button onClick={onComplete} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};

const BurndownModal = ({ risk, onClose, onRiskUpdated }) => {
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [assignees, setAssignees] = useState('');
  const [achievability, setAchievability] = useState('');
  const [resourcesNeeded, setResourcesNeeded] = useState('');
  const [impactOnConsequence, setImpactOnConsequence] = useState('');
  const [likelihoodReduction, setLikelihoodReduction] = useState(0);
  const [impactReduction, setImpactReduction] = useState(0);

  const [completingStep, setCompletingStep] = useState(null);
  const [actualLikelihood, setActualLikelihood] = useState(risk.likelihood || 1);
  const [actualImpact, setActualImpact] = useState(risk.impact || 1);
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().substring(0, 10));

  const [loading, setLoading] = useState(false);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [customValues, setCustomValues] = useState({});

  React.useEffect(() => {
    apiFetch('http://localhost:3000/api/fields/burndown')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setFieldDefs(data); })
      .catch(console.error);
  }, []);

  const handleAddStep = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch(`http://localhost:3000/api/risks/${risk.id}/burndown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description, targetDate, assignees, achievability,
          resourcesNeeded, impactOnConsequence, likelihoodReduction, impactReduction
        })
      });

      if (!response.ok) throw new Error('Failed to create step');
      
      const newStep = await response.json();
      newStep.customFields = [];

      const customEntries = fieldDefs
        .filter(f => customValues[f.name] !== undefined && customValues[f.name] !== '')
        .map(f => ({ name: f.name, value: customValues[f.name] }));

      if (customEntries.length > 0) {
        const cfRes = await apiFetch(`http://localhost:3000/api/risks/${risk.id}/burndown/${newStep.id}/custom-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: customEntries })
        });
        if (cfRes.ok) newStep.customFields = await cfRes.json();
      }

      const newSteps = [...(risk.burndownSteps || []), newStep].sort((a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      );

      onRiskUpdated({ ...risk, burndownSteps: newSteps });
      
      setDescription(''); setTargetDate(''); setAssignees('');
      setAchievability(''); setResourcesNeeded(''); setImpactOnConsequence('');
      setLikelihoodReduction(0); setImpactReduction(0); setCustomValues({});
    } catch (err) {
      console.error(err);
      toast.error('Error creating burndown step.');
    } finally {
      setLoading(false);
    }
  };

  const executeCompleteStep = async () => {
    try {
      const response = await apiFetch(`http://localhost:3000/api/risks/${risk.id}/burndown/${completingStep.id}/complete`, { 
        method: 'PUT', 
        body: JSON.stringify({ actualLikelihood: Number(actualLikelihood), actualImpact: Number(actualImpact) }) 
      });
      if (!response.ok) throw new Error('Failed to complete step');
      
      const fullyUpdatedRisk = {
        ...risk,
        likelihood: Number(actualLikelihood),
        impact: Number(actualImpact),
        burndownSteps: risk.burndownSteps.map(step => 
          step.id === completingStep.id ? { ...step, isCompleted: true, completedAt: new Date(completedDate).toISOString() } : step
        )
      };
      onRiskUpdated(fullyUpdatedRisk);
      setCompletingStep(null);
    } catch (err) {
      console.error(err);
      toast.error('Error completing step.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Action Plan (Burndown): {risk.title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Active & Completed Actions</h3>
          {(!risk.burndownSteps || risk.burndownSteps.length === 0) ? (
            <p style={{ color: 'var(--text-muted)' }}>No actions recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...risk.burndownSteps]
                .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                .map(step => (
                <StepRow 
                  key={step.id} step={step} riskId={risk.id} 
                  onStepUpdated={(updatedStep) => {
                    const updatedRisk = {
                      ...risk,
                      burndownSteps: risk.burndownSteps.map(s => s.id === updatedStep.id ? updatedStep : s)
                    };
                    onRiskUpdated(updatedRisk);
                  }}
                  onComplete={() => {
                    setCompletingStep(step);
                    setActualLikelihood(Math.max(1, (risk.likelihood || 1) - (step.likelihoodReduction || 0)));
                    setActualImpact(Math.max(1, (risk.impact || 1) - (step.impactReduction || 0)));
                    setCompletedDate(new Date().toISOString().substring(0, 10));
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Add New Action</h3>
          <form onSubmit={handleAddStep} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Description of Action</label>
                <input required type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Implement 2FA" />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <input required type="date" className="form-input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Assignees</label>
                <input type="text" className="form-input" value={assignees} onChange={e => setAssignees(e.target.value)} placeholder="Comma-separated" />
              </div>
              <div>
                <label className="form-label">Probability Reduction</label>
                <input type="number" min="0" max="5" className="form-input" value={likelihoodReduction} onChange={e => setLikelihoodReduction(Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Consequence Reduction</label>
                <input type="number" min="0" max="5" className="form-input" value={impactReduction} onChange={e => setImpactReduction(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label className="form-label">Achievability</label>
              <textarea className="form-input" rows="2" value={achievability} onChange={e => setAchievability(e.target.value)} placeholder="How achievable is this and how does it contribute?" />
            </div>
            
            <div>
              <label className="form-label">Resources Needed</label>
              <textarea className="form-input" rows="2" value={resourcesNeeded} onChange={e => setResourcesNeeded(e.target.value)} placeholder="List of resources and availability" />
            </div>

            <div>
              <label className="form-label">Impact on Consequence</label>
              <textarea className="form-input" rows="2" value={impactOnConsequence} onChange={e => setImpactOnConsequence(e.target.value)} placeholder="How this reduces impacts..." />
            </div>

            {fieldDefs.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Additional Fields</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {fieldDefs.map(field => (
                    <div key={field.id}>
                      <label className="form-label">{field.name} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                      <input
                        type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                        className="form-input" required={field.required}
                        value={customValues[field.name] || ''} onChange={e => setCustomValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn" disabled={loading}>{loading ? 'Adding...' : 'Add Action'}</button>
            </div>
          </form>
        </div>
      </div>
      
      {completingStep && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Complete Action</h3>
            <p style={{ color: 'var(--text-muted)' }}>Confirm the new actual scores and date of completion:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0' }}>
              {risk.itemType !== 'Issue' && (
                <div>
                  <label className="form-label">New Probability (1-5)</label>
                  <input type="number" min="1" max="5" className="form-input" value={actualLikelihood} onChange={e => setActualLikelihood(Number(e.target.value))} />
                </div>
              )}
              <div>
                <label className="form-label">New Consequence (1-5)</label>
                <input type="number" min="1" max="5" className="form-input" value={actualImpact} onChange={e => setActualImpact(Number(e.target.value))} />
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Date Completed</label>
              <input type="date" className="form-input" value={completedDate} onChange={e => setCompletedDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setCompletingStep(null)}>Cancel</button>
              <button className="btn" onClick={executeCompleteStep}>Confirm Completion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BurndownModal;
