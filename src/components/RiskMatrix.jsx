import React from 'react';

const getScoreClass = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score <= 4) return 'score-low';
  if (score <= 9) return 'score-med';
  if (score <= 16) return 'score-high';
  return 'score-extreme';
};

const RiskMatrix = ({ risks }) => {
  // 5x5 Matrix: Likelihood (y-axis: 1-5), Impact (x-axis: 1-5)
  // Top-left is Likelihood 5, Impact 1. Bottom-right is Likelihood 1, Impact 5.
  
  const cells = [];
  for (let l = 5; l >= 1; l--) {
    for (let i = 1; i <= 5; i++) {
      const cellRisks = risks.filter(r => r.likelihood === l && r.impact === i);
      cells.push(
        <div 
          key={`${l}-${i}`} 
          className={`matrix-cell ${getScoreClass(l, i)}`} 
          title={`Likelihood: ${l}, Impact: ${i}`}
          style={{ padding: '4px', overflowY: 'auto' }}
        >
          {cellRisks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
              {cellRisks.map(r => (
                <span key={r.id} style={{ 
                  fontSize: '1.1rem', 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '4px 8px', 
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}>
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
      <h2>Risk Matrix</h2>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', fontWeight: 'bold' }}>
          Likelihood
        </div>
        <div style={{ flex: 1 }}>
          <div className="risk-matrix">
            {cells}
          </div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '1rem' }}>
            Impact
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMatrix;
