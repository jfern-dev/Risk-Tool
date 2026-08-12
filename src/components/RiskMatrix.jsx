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
  return riskMatrixColors[likelihood][impact - 1];
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

const RiskMatrix = ({ risks, activeType = 'Risk' }) => {
  
  if (activeType === 'Issue') {
    const cells = [];
    for (let i = 1; i <= 5; i++) {
      const cellRisks = risks.filter(r => r.impact === i);
      cells.push(
        <div 
          key={`issue-${i}`} 
          className={`matrix-cell ${getIssueScoreClass(i)}`} 
          title={`Impact: ${i}`}
          style={{ padding: '4px', overflowY: 'auto', minHeight: '120px' }}
        >
          {cellRisks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
              {cellRisks.map(r => (
                <span key={r.id} style={{ fontSize: '1.1rem', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                  {r.userRiskId}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="card">
        <h2>Issue Matrix</h2>
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
              Impact
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const cells = [];
  for (let l = 5; l >= 1; l--) {
    for (let i = 1; i <= 5; i++) {
      const cellRisks = risks.filter(r => r.likelihood === l && r.impact === i);
      const cellClass = activeType === 'Opportunity' ? getOppScoreClass(l, i) : getScoreClass(l, i);
      cells.push(
        <div 
          key={`${l}-${i}`} 
          className={`matrix-cell ${cellClass}`} 
          title={`Likelihood: ${l}, Impact: ${i}`}
          style={{ padding: '4px', overflowY: 'auto' }}
        >
          {cellRisks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
              {cellRisks.map(r => (
                <span key={r.id} style={{ fontSize: '1.1rem', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                  {r.userRiskId}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="card">
      <h2>{activeType} Matrix</h2>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', fontWeight: 'bold' }}>
          Likelihood
        </div>
        <div style={{ flex: 1 }}>
          <div className="risk-matrix">
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
            Impact
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMatrix;
