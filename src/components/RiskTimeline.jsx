import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const RiskTimeline = ({ risk, isPrint = false, height, showHeader = true }) => {
  if (!risk || !risk.burndownSteps || risk.burndownSteps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)', borderRadius: '6px', height: height || '100%', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        No action plan established for this item yet.
      </div>
    );
  }

  // Initial score from DB
  const initialDate = (risk.discoveredDate ? new Date(risk.discoveredDate) : new Date(risk.createdAt || Date.now())).getTime();
  let initialL = risk.initialLikelihood;
  let initialI = risk.initialImpact;

  if (initialL === undefined) {
    const totalLikelihoodReduction = risk.burndownSteps.filter(s => s.isCompleted).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
    const totalImpactReduction = risk.burndownSteps.filter(s => s.isCompleted).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
    initialL = Math.min(5, risk.likelihood + totalLikelihoodReduction);
    initialI = Math.min(5, risk.impact + totalImpactReduction);
  }

  let currentTargetL = initialL;
  let currentTargetI = initialI;
  
  // Gather all target events (projections)
  const targetEvents = risk.burndownSteps.filter(s => s.targetDate).map(s => ({
    date: new Date(s.targetDate).getTime(),
    isTarget: true,
    step: s
  }));
  
  // Gather all actual events (snapshots from DB)
  const actualEvents = risk.burndownSteps.filter(s => s.isCompleted && s.completedAt).map(s => ({
    date: new Date(s.completedAt).getTime(),
    isActual: true,
    step: s
  }));

  const today = new Date().getTime();
  const allEvents = [...targetEvents, ...actualEvents].sort((a, b) => a.date - b.date);
  
  // Ensure the initial point is chronologically before or equal to the earliest event
  const earliestEventDate = allEvents.length > 0 ? allEvents[0].date : initialDate;
  const chartStartDate = Math.min(initialDate, earliestEventDate - (1000 * 60 * 60 * 24)); // 1 day before earliest event if initialDate is later
  
  const points = [];
  
  // Initial point
  points.push({
    date: chartStartDate,
    targetScore: currentTargetL * currentTargetI,
    actualScore: initialL * initialI,
    label: 'Identified',
  });

  let currentActualL = initialL;
  let currentActualI = initialI;

  allEvents.forEach(event => {
    if (event.isTarget) {
      currentTargetL = Math.max(1, currentTargetL - (event.step.likelihoodReduction || 0));
      currentTargetI = Math.max(1, currentTargetI - (event.step.impactReduction || 0));
    }
    if (event.isActual) {
      currentActualL = event.step.actualLikelihood || Math.max(1, currentActualL - (event.step.likelihoodReduction || 0));
      currentActualI = event.step.actualImpact || Math.max(1, currentActualI - (event.step.impactReduction || 0));
    }
    
    points.push({
      date: event.date,
      targetScore: currentTargetL * currentTargetI,
      actualScore: event.date > today ? null : currentActualL * currentActualI,
      event: event.step.description,
      isProjected: event.isTarget || false,
    });
  });

  const formatXAxis = (tickItem) => {
    return new Date(tickItem).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '4px', boxShadow: 'var(--shadow)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{new Date(label).toLocaleDateString()}</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text)' }}>{data.event}</p>
          {data.isProjected && <span style={{ fontSize: '0.75rem', background: 'var(--warning)', color: 'black', padding: '2px 6px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>Projected</span>}
          <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontWeight: 'bold' }}>Target Score: {data.targetScore}</p>
          <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>Actual Score: {data.actualScore}</p>
        </div>
      );
    }
    return null;
  };

  const ChartContent = (
    <LineChart data={points} margin={{ top: 15, right: 20, left: -20, bottom: 0 }} width={isPrint ? 800 : undefined} height={isPrint ? 200 : undefined}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis 
        dataKey="date" 
        type="number" 
        domain={[(dataMin) => dataMin - (7 * 24 * 60 * 60 * 1000), 'dataMax']}
        tickFormatter={formatXAxis} 
        stroke="var(--text-muted)"
        fontSize={11}
        tickMargin={8}
      />
      <YAxis 
        stroke="var(--text-muted)" 
        fontSize={11}
        domain={[0, 25]} 
        ticks={[0, 5, 10, 15, 20, 25]}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
      <ReferenceLine x={today} stroke="var(--danger)" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: 'var(--danger)', fontSize: 11 }} />
      <Line 
        name="Target Risk Score"
        type="stepAfter" 
        dataKey="targetScore" 
        stroke="var(--text-muted)" 
        strokeWidth={2}
        strokeDasharray="4 4"
        dot={{ r: 3, fill: 'var(--text-muted)' }}
        activeDot={{ r: 5 }}
        isAnimationActive={!isPrint}
      />
      <Line 
        name="Actual Risk Score"
        type="stepAfter" 
        dataKey="actualScore" 
        stroke="var(--primary)" 
        strokeWidth={3}
        dot={{ r: 4, fill: 'var(--primary)' }}
        activeDot={{ r: 6 }}
        isAnimationActive={!isPrint}
      />
    </LineChart>
  );

  return (
    <div style={{ height: height || '220px', width: '100%', marginTop: showHeader ? '0.5rem' : '0', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column' }}>
      {showHeader && <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Burndown Timeline</h5>}
      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        {isPrint ? (
          ChartContent
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {ChartContent}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RiskTimeline;
