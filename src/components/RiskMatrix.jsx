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

const RiskMatrix = ({ risks, activeType = 'Risk', hideIds = false, showCounts = false, isPrint = false }) => {
  
  if (activeType === 'Issue') {
    const cells = [];
    for (let i = 1; i <= 5; i++) {
      const cellRisks = risks.filter(r => r.impact === i);
      cells.push(
        <div 
          key={`issue-${i}`} 
          className={`matrix-cell ${getIssueScoreClass(i)}`} 
          title={`Consequence: ${i}`}
          style={{ padding: '4px', overflowY: 'auto' }}
        >
          {cellRisks.length > 0 && (
            showCounts ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                {cellRisks.length}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                {cellRisks.map(r => (
                  <span key={r.id} style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                    {hideIds ? 'X' : r.userRiskId}
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
          </div>
        </div>
      </div>
    );
  }
  
  const isCombined = activeType === 'All';
  const maxL = isCombined ? 6 : 5;

  const cells = [];
  for (let l = maxL; l >= 1; l--) {
    for (let i = 1; i <= 5; i++) {
      let cellRisks = [];
      let cellClass = '';

      if (isCombined && l === 6) {
        cellRisks = risks.filter(r => r.itemType === 'Issue' && r.impact === i);
        cellClass = getIssueScoreClass(i);
      } else {
        // For combined, exclude Issues from l=1..5
        cellRisks = risks.filter(r => r.likelihood === l && r.impact === i && (!isCombined || r.itemType !== 'Issue'));
        cellClass = activeType === 'Opportunity' ? getOppScoreClass(l, i) : getScoreClass(l, i);
      }

      let markersToRender = [];
      if (hideIds) {
        // Find all risks that have their Current, Initial, or Target in this cell
        risks.forEach(r => {
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

      cells.push(
        <div 
          key={`${l}-${i}`} 
          className={`matrix-cell ${cellClass}`} 
          title={isCombined && l === 6 ? `Issue Consequence: ${i}` : `Probability: ${l}, Consequence: ${i}`}
          style={{ padding: '4px', overflowY: 'auto' }}
        >
          {markersToRender.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
              {markersToRender.map((m, idx) => (
                hideIds ? (
                  <div key={m.risk.id + '-' + idx} style={{ position: 'relative', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.isInitial && <div style={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', border: '2px solid white', backgroundColor: 'transparent' }} title="Approved Risk Level" />}
                    {m.isTarget && <div style={{ position: 'absolute', width: '18px', height: '18px', border: '2px solid white', backgroundColor: 'transparent' }} title="Target Risk Level (After Actions)" />}
                    {m.isCurrent && <span style={{ position: 'absolute', fontSize: '1.2rem', fontWeight: 'bold', color: 'white', zIndex: 2, lineHeight: 1 }} title="Current Risk Level">X</span>}
                  </div>
                ) : (
                  <span key={m.risk.id + '-' + idx} style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                    {m.risk.userRiskId}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className={isPrint ? '' : 'card'}>
      {!isPrint && <h2>{isCombined ? 'Combined RIO Matrix' : `${activeType} Matrix`}</h2>}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {isCombined && (
            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', fontWeight: 'bold', height: '60px', marginBottom: '1rem', color: 'var(--danger)' }}>
              Issues
            </div>
          )}
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', fontWeight: 'bold' }}>
            Probability
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: '40px', display: 'grid', gridTemplateRows: `repeat(${maxL}, 1fr)`, gap: '4px', padding: '4px 8px 4px 0', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', marginTop: '0' }}>
              {Array.from({ length: maxL }).map((_, idx) => {
                const l = maxL - idx;
                let label = l === 6 ? 'Issues' : (l === 5 ? '5' : (l === 3 ? '3' : (l === 1 ? '1' : '')));
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
            <div style={{ width: '40px' }}></div>
            <div style={{ flex: 1 }}>
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
              {hideIds && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--text)' }}></div>
                    <span>Initial</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '14px', height: '14px', border: '2px solid var(--text)' }}></div>
                    <span>Target</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1 }}>X</span>
                    <span>Current</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RiskMatrix;
