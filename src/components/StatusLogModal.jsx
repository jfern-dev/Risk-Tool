import React, { useState } from 'react';
import { X, Clock, PlusCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';

const StatusLogModal = ({ risk, onClose, onRiskUpdated }) => {
  const [status, setStatus] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [challenges, setChallenges] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddLog = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newLog = {
        id: Date.now(),
        date: new Date().toISOString(),
        status,
        takeaways,
        challenges
      };

      const newLogs = [...(risk.statusLogs || []), newLog].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ); // Sort newest first

      const updatedRisk = { ...risk, statusLogs: newLogs };

      const response = await apiFetch(`http://localhost:3000/api/risks/${risk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRisk)
      });

      if (!response.ok) throw new Error('Failed to save log');

      onRiskUpdated(updatedRisk);
      setStatus('');
      setTakeaways('');
      setChallenges('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      toast.error('Error creating status log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={24} color="var(--primary)" />
            Status Logs: {risk.title}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {isAdding ? (
          <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)', marginBottom: '2rem' }}>
            <div>
              <label className="form-label">Status Update</label>
              <textarea required className="form-input" rows="3" value={status} onChange={e => setStatus(e.target.value)} placeholder="Current status..." />
            </div>
            <div>
              <label className="form-label">Key Takeaways</label>
              <textarea className="form-input" rows="2" value={takeaways} onChange={e => setTakeaways(e.target.value)} placeholder="Any takeaways..." />
            </div>
            <div>
              <label className="form-label">Challenges</label>
              <textarea className="form-input" rows="2" value={challenges} onChange={e => setChallenges(e.target.value)} placeholder="Blockers or challenges..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIsAdding(false)} className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>Cancel</button>
              <button type="submit" className="btn" disabled={loading}>{loading ? 'Saving...' : 'Save Log'}</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <button onClick={() => setIsAdding(true)} className="btn">
              <PlusCircle size={16} style={{ marginRight: '0.5rem' }} /> Add New Log
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(!risk.statusLogs || risk.statusLogs.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '2rem' }}>No status logs recorded yet.</p>
          ) : (
            [...(risk.statusLogs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => (
              <div key={log.id} style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {new Date(log.date).toLocaleString()}
                </div>
                
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Status</span>
                  <p style={{ margin: 0 }}>{log.status}</p>
                </div>

                {log.takeaways && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Takeaways</span>
                    <p style={{ margin: 0 }}>{log.takeaways}</p>
                  </div>
                )}

                {log.challenges && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Challenges</span>
                    <p style={{ margin: 0, color: 'var(--danger)' }}>{log.challenges}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusLogModal;
