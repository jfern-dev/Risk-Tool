import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, TrendingDown, ChevronDown, FolderOpen, FilePlus } from 'lucide-react';
import RiskMatrix from '../components/RiskMatrix';
import RiskFormModal from '../components/RiskFormModal';
import BurndownModal from '../components/BurndownModal';
import RiskTimeline from '../components/RiskTimeline';
import AttachmentsModal from '../components/AttachmentsModal';
import { apiFetch } from '../utils/api';

const getScoreColor = (l, i) => {
  const score = l * i;
  if (score >= 15) return 'var(--danger)';
  if (score >= 8) return 'var(--warning)';
  return 'var(--success)';
};

const Dashboard = () => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBurndownRisk, setActiveBurndownRisk] = useState(null);
  const [activeAttachmentsRisk, setActiveAttachmentsRisk] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    apiFetch('http://localhost:3000/api/risks')
      .then(res => res.json())
      .then(data => {
        if (data.error || !Array.isArray(data)) {
          console.error(data.error || 'Expected array');
          setRisks([]);
        } else {
          setRisks(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setRisks([]);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading ERM Data...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Risk Dashboard</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => window.electron.ipcRenderer.invoke('api-new-file')}>
            <FilePlus size={18} style={{ marginRight: '8px' }} />
            New File
          </button>
          <button className="btn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => window.electron.ipcRenderer.invoke('api-open-file')}>
            <FolderOpen size={18} style={{ marginRight: '8px' }} />
            Open File
          </button>
          <button className="btn" onClick={() => setIsModalOpen(true)}>
            <PlusCircle size={18} style={{ marginRight: '8px' }} />
            New Risk
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          <RiskMatrix risks={risks} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Recent Risks</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{risks.length} risk{risks.length !== 1 ? 's' : ''}</span>
          </div>

          {risks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No risks identified yet. Add a new risk to get started.
            </div>
          ) : (
            risks.map(risk => {
              const isExpanded = expandedIds.has(risk.id);
              const score = risk.likelihood * risk.impact;
              return (
                <div key={risk.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Collapsed header — always visible */}
                  <div
                    onClick={() => toggleExpand(risk.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.875rem 1.25rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: '4px', flexShrink: 0 }}>
                        {risk.userRiskId}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {risk.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', background: 'var(--border)', whiteSpace: 'nowrap' }}>
                        L: {risk.likelihood} | I: {risk.impact}
                      </span>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: getScoreColor(risk.likelihood, risk.impact),
                        color: '#fff',
                        whiteSpace: 'nowrap'
                      }}>
                        Score: {score}
                      </span>
                      <ChevronDown
                        size={18}
                        color="var(--text-muted)"
                        style={{ transition: 'transform 0.25s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                      />
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {risk.description && (
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{risk.description}</p>
                      )}
                      {risk.customFields && risk.customFields.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {risk.customFields.map(cf => (
                            <span key={cf.id} style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              <strong style={{ color: 'var(--text)' }}>{cf.name}:</strong> {cf.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <RiskTimeline risk={risk} />
                      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <button
                          className="btn"
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}
                          onClick={(e) => { e.stopPropagation(); setActiveBurndownRisk(risk); }}
                        >
                          <TrendingDown size={16} style={{ marginRight: '6px' }} />
                          Burndown Steps ({risk.burndownSteps?.length || 0})
                        </button>
                        <button 
                          className="btn" 
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}
                          onClick={(e) => { e.stopPropagation(); setActiveAttachmentsRisk(risk); }}
                        >
                          <FileText size={16} style={{ marginRight: '6px' }} />
                          Attachments ({risk.attachments?.length || 0})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <RiskFormModal
          onClose={() => setIsModalOpen(false)}
          onRiskAdded={(newRisk) => setRisks([newRisk, ...risks])}
        />
      )}

      {activeBurndownRisk && (
        <BurndownModal
          risk={activeBurndownRisk}
          onClose={() => setActiveBurndownRisk(null)}
          onRiskUpdated={(updatedRisk) => {
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            setActiveBurndownRisk(updatedRisk);
          }}
        />
      )}

      {activeAttachmentsRisk && (
        <AttachmentsModal
          risk={activeAttachmentsRisk}
          onClose={() => setActiveAttachmentsRisk(null)}
          onAttachmentAdded={(newAttachment) => {
            const updatedRisk = {
              ...activeAttachmentsRisk,
              attachments: [...(activeAttachmentsRisk.attachments || []), newAttachment]
            };
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            setActiveAttachmentsRisk(updatedRisk);
          }}
          onAttachmentRemoved={(attachmentId) => {
            const updatedRisk = {
              ...activeAttachmentsRisk,
              attachments: activeAttachmentsRisk.attachments.filter(a => a.id !== attachmentId)
            };
            setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
            setActiveAttachmentsRisk(updatedRisk);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;

