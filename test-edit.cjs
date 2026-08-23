const fs = require('fs');
let content = fs.readFileSync('/home/fern/projects/Risk-Tool/src/pages/Briefing.jsx', 'utf8');

const importReplacement = `import { apiFetch } from '../utils/api';
import { runMonteCarloSimulation } from '../utils/mcEngine';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const MonteCarloWidget = ({ risk }) => {
  const mcResults = React.useMemo(() => {
    if (!risk) return null;
    return runMonteCarloSimulation([risk], {}, 10000);
  }, [risk]);

  if (!mcResults) return null;

  return (
    <div style={{ padding: '0.75rem', height: '100%', overflowY: 'auto' }}>
      <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Monte Carlo Impacts (50% / 80% / 90% Confidence)</strong>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
        <div style={{ background: 'var(--glass-bg)', padding: '0.6rem', borderRadius: '6px' }}>
          <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--info)' }}>Cost Exposure</strong>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>P50:</span> <strong>{formatCurrency(mcResults.costStats.p50)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>P80:</span> <strong>{formatCurrency(mcResults.costStats.p80)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>P90:</span> <strong>{formatCurrency(mcResults.costStats.p90)}</strong></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Inputs: {formatCurrency(risk.mcMinCost||0)} / {formatCurrency(risk.mcMostLikelyCost||0)} / {formatCurrency(risk.mcMaxCost||0)}</div>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '0.6rem', borderRadius: '6px' }}>
          <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--warning)' }}>Schedule Exposure</strong>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>P50:</span> <strong>{Math.round(mcResults.scheduleStats.p50)} Days</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>P80:</span> <strong>{Math.round(mcResults.scheduleStats.p80)} Days</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>P90:</span> <strong>{Math.round(mcResults.scheduleStats.p90)} Days</strong></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Inputs: {risk.mcMinSchedule||0} / {risk.mcMostLikelySchedule||0} / {risk.mcMaxSchedule||0}</div>
        </div>
      </div>
    </div>
  );
};
`;
content = content.replace("import { apiFetch } from '../utils/api';", importReplacement);

const widgetReplacement = `      case 'monteCarlo': return <MonteCarloWidget risk={risk} />;
      case 'scores':
        const currentL = risk.likelihood || 1;
        const currentI = risk.impact || 1;
        const totalLReducCompleted = (risk.burndownSteps || []).filter(s => s.isCompleted).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
        const totalIReducCompleted = (risk.burndownSteps || []).filter(s => s.isCompleted).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
        const initL = risk.initialLikelihood ?? Math.min(5, currentL + totalLReducCompleted);
        const initI = risk.initialImpact ?? Math.min(5, currentI + totalIReducCompleted);
        
        const totalLReducAll = (risk.burndownSteps || []).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
        const totalIReducAll = (risk.burndownSteps || []).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
        const targetL = Math.max(1, initL - totalLReducAll);
        const targetI = Math.max(1, initI - totalIReducAll);

        return (
          <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', height: '100%', textAlign: 'center' }}>
            <div style={{ background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Initial</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{initL * initI}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(P:{initL} C:{initI})</div>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid var(--primary)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 600 }}>Current</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{currentL * currentI}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(P:{currentL} C:{currentI})</div>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{targetL * targetI}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(P:{targetL} C:{targetI})</div>
            </div>
          </div>
        );`;

// We need to replace the old monteCarlo case
const oldMonteCarloRegex = /case 'monteCarlo':[\s\S]*?Max: \{risk\.monteCarloImpactSchedule\?\.max \|\| 0\}<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*/;
content = content.replace(oldMonteCarloRegex, widgetReplacement + '\n');

fs.writeFileSync('/home/fern/projects/Risk-Tool/src/pages/Briefing.jsx', content, 'utf8');
console.log("Replaced successfully!");
