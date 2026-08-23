import React from 'react';

const riskMatrixColors = {
  5: ['score-low', 'score-med', 'score-high', 'score-high', 'score-high'],
  4: ['score-low', 'score-med', 'score-med', 'score-high', 'score-high'],
  3: ['score-low', 'score-low', 'score-med', 'score-med', 'score-high'],
  2: ['score-low', 'score-low', 'score-low', 'score-med', 'score-med'],
  1: ['score-low', 'score-low', 'score-low', 'score-low', 'score-med']
};

export const getScoreClass = (likelihood, impact) => {
  if (!likelihood || !impact) return 'score-low';
  const clampedL = Math.max(1, Math.min(5, likelihood));
  const clampedI = Math.max(1, Math.min(5, impact));
  return riskMatrixColors[clampedL][clampedI - 1];
};

export const getOppScoreClass = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score <= 4) return 'score-opp-low';
  if (score <= 9) return 'score-opp-med';
  if (score <= 16) return 'score-opp-high';
  return 'score-opp-extreme';
};

export const getIssueScoreClass = (impact) => {
  if (impact <= 2) return 'score-med';
  if (impact <= 4) return 'score-high';
  return 'score-extreme';
};

const RiskMatrix = ({ risks, data, activeType, type, hideIds = false, showCounts = true, isPrint = false, showMarkers = false }) => {
  const safeRisks = Array.isArray(risks) ? risks : (Array.isArray(data) ? data : []);
  const currentType = activeType || type || 'Risk';
  // Render progression markers (Initial circle, Current X, Target square) only when explicitly requested
  // and NOT when showCounts is true (which shows total per cell on the Dashboard)
  const renderMarkers = !showCounts && (showMarkers || hideIds);
  
  if (currentType === 'Issue') {
    const cells = [];
    for (let i = 1; i <= 5; i++) {
      const cellRisks = safeRisks.filter(r => r.impact === i);
      const titleText = cellRisks.length > 0
        ? `Consequence: ${i} (${cellRisks.length} item${cellRisks.length > 1 ? 's' : ''}: ${cellRisks.map(r => r.userRiskId).join(', ')})`
        : `Consequence: ${i}`;
      cells.push(
        <div 
          key={`issue-${i}`} 
          className={`matrix-cell ${getIssueScoreClass(i)}`} 
          title={titleText}
          style={{ padding: '4px', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {cellRisks.length > 0 && (
            renderMarkers ? (
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }} title="Current Consequence Level">
                ✕
              </span>
            ) : showCounts ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.95)' }}>
                {cellRisks.length}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                {cellRisks.map(r => (
                  <span key={r.id} style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                    {r.userRiskId}
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      );
    }
    
    return (
      <div className={isPrint ? '' : 'card'}>
        {!isPrint && <h2>Issue Matrix</h2>}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div className="risk-matrix-1x5">
              {cells}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', textAlign: 'center', marginTop: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <div>1 (Low)</div>
              <div>2</div>
              <div>3 (Medium)</div>
              <div>4</div>
              <div>5 (Extreme)</div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.5rem' }}>
              Consequence
            </div>
            {renderMarkers && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.85rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1, color: 'var(--text)' }}>✕</span>
                  <span style={{ color: 'var(--text-muted)' }}>Current Issue Consequence</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const isCombined = currentType === 'All';
  const maxL = isCombined ? 6 : 5;

  const cells = [];
  for (let l = maxL; l >= 1; l--) {
    for (let i = 1; i <= 5; i++) {
      let cellRisks = [];
      let cellClass = '';

      if (isCombined && l === 6) {
        cellRisks = safeRisks.filter(r => r.itemType === 'Issue' && r.impact === i);
        cellClass = getIssueScoreClass(i);
      } else {
        // For combined, exclude Issues from l=1..5
        cellRisks = safeRisks.filter(r => r.likelihood === l && r.impact === i && (!isCombined || r.itemType !== 'Issue'));
        cellClass = currentType === 'Opportunity' ? getOppScoreClass(l, i) : getScoreClass(l, i);
      }

      let markersToRender = [];
      if (renderMarkers) {
        // Find all risks that have their Current, Initial, or Target in this cell
        safeRisks.forEach(r => {
          const currentL = r.likelihood || 1;
          const currentI = r.impact || 1;
          
          const totalLReducCompleted = (r.burndownSteps || []).filter(s => s.isCompleted).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
          const totalIReducCompleted = (r.burndownSteps || []).filter(s => s.isCompleted).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
          const initialL = r.initialLikelihood ?? Math.min(5, currentL + totalLReducCompleted);
          const initialI = r.initialImpact ?? Math.min(5, currentI + totalIReducCompleted);

          const totalLReducAll = (r.burndownSteps || []).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
          const totalIReducAll = (r.burndownSteps || []).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
          const targetL = Math.max(1, initialL - totalLReducAll);
          const targetI = Math.max(1, initialI - totalIReducAll);

          const isCurrent = currentL === l && currentI === i;
          const isInitial = initialL === l && initialI === i;
          const isTarget = targetL === l && targetI === i;

          if (isCurrent || isInitial || isTarget) {
            markersToRender.push({ risk: r, isCurrent, isInitial, isTarget });
          }
        });
      } else {
        markersToRender = cellRisks.map(r => ({ risk: r, isCurrent: true, isInitial: false, isTarget: false }));
      }

      const titleText = cellRisks.length > 0
        ? `${isCombined && l === 6 ? `Issue Consequence: ${i}` : `Probability: ${l}, Consequence: ${i}`} (${cellRisks.length} item${cellRisks.length > 1 ? 's' : ''}: ${cellRisks.map(r => r.userRiskId).join(', ')})`
        : (isCombined && l === 6 ? `Issue Consequence: ${i}` : `Probability: ${l}, Consequence: ${i}`);

      cells.push(
        <div 
          key={`${l}-${i}`} 
          className={`matrix-cell ${cellClass}`} 
          title={titleText}
          style={{ padding: '4px', overflowY: 'auto' }}
        >
          {!renderMarkers && showCounts ? (
            cellRisks.length > 0 && (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.95)' }}>
                {cellRisks.length}
              </div>
            )
          ) : (
            markersToRender.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                {markersToRender.map((m, idx) => (
                  renderMarkers ? (
                    <div key={m.risk.id + '-' + idx} style={{ position: 'relative', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.isInitial && (
                        <div 
                          style={{ position: 'absolute', width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid white', backgroundColor: 'transparent', boxSizing: 'border-box' }} 
                          title="Initial Approved Risk Level (Circle)" 
                        />
                      )}
                      {m.isTarget && (
                        <div 
                          style={{ position: 'absolute', width: '24px', height: '24px', border: '2.5px solid white', backgroundColor: 'transparent', boxSizing: 'border-box', borderRadius: '2px' }} 
                          title="Target Risk Level After Actions (Square)" 
                        />
                      )}
                      {m.isCurrent && (
                        <span 
                          style={{ position: 'absolute', fontSize: '1.3rem', fontWeight: 900, color: 'white', zIndex: 2, lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }} 
                          title="Current Risk Level (X)"
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  ) : (
                    <span key={m.risk.id + '-' + idx} style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      {m.risk.userRiskId}
                    </span>
                  )
                ))}
              </div>
            )
          )}
        </div>
      );
    }
  }

  return (
    <div className={isPrint ? '' : 'card'} style={{ position: 'relative' }}>
      {!isPrint && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{isCombined ? 'Combined Matrix (5x5)' : `${currentType} Heatmap Matrix`}</h3>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '24px' }}>
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            PROBABILITY
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: '32px', display: 'grid', gridTemplateRows: `repeat(${maxL}, 1fr)`, gap: '4px', padding: '4px 6px 4px 0', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0' }}>
              {Array.from({ length: maxL }).map((_, idx) => {
                const l = maxL - idx;
                let label = l === 6 ? '' : l;
                return (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {label}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1 }}>
              <div className="risk-matrix">
                {cells}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex' }}>
            <div style={{ width: '32px' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', textAlign: 'center', marginTop: '0.4rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <div>1</div>
                <div>2</div>
                <div>3</div>
                <div>4</div>
                <div>5</div>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', letterSpacing: '0.04em' }}>
                CONSEQUENCE
              </div>
              {renderMarkers && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid var(--text)' }}></div>
                    <span style={{ color: 'var(--text-muted)' }}>Initial (Circle)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '1rem', lineHeight: 1, color: 'var(--text)' }}>✕</span>
                    <span style={{ color: 'var(--text-muted)' }}>Current (X)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '13px', height: '13px', border: '2px solid var(--text)', borderRadius: '2px' }}></div>
                    <span style={{ color: 'var(--text-muted)' }}>Target (Square)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Matrix Color Legend (for Multi-Item views) */}
      {!renderMarkers && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#059669', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Low</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#D97706', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Medium</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#DC2626', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#991B1B', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Extreme</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskMatrix;
