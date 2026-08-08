import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { format } from 'date-fns';

const RiskTimeline = ({ risk }) => {
  if (!risk.burndownSteps || risk.burndownSteps.length === 0) {
    return null;
  }

  // Initial score from DB
  const initialDate = new Date(risk.createdAt).getTime();
  let currentTargetL = risk.initialLikelihood || risk.likelihood;
  let currentTargetI = risk.initialImpact || risk.impact;
  
  // Gather all target events (projections)
  const targetEvents = risk.burndownSteps.map(s => ({
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

  const allEvents = [...targetEvents, ...actualEvents].sort((a, b) => a.date - b.date);
  
  const points = [];
  
  // Initial point
  points.push({
    date: initialDate,
    targetScore: currentTargetL * currentTargetI,
    actualScore: (risk.initialLikelihood || risk.likelihood) * (risk.initialImpact || risk.impact),
    label: 'Identified',
  });

  let currentActualL = risk.initialLikelihood || risk.likelihood;
  let currentActualI = risk.initialImpact || risk.impact;

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
      actualScore: currentActualL * currentActualI,
      label: event.step.description,
      isTargetEvent: event.isTarget,
      isActualEvent: event.isActual,
    });
  });

  // Add a final point for "Today" so the actual line extends to the present if no recent steps
  const today = new Date().getTime();
  if (points.length > 0 && points[points.length - 1].date < today) {
    points.push({
      date: today,
      targetScore: currentTargetL * currentTargetI,
      actualScore: currentActualL * currentActualI,
      label: 'Today',
    });
  }

  const formatXAxis = (tickItem) => {
    return format(new Date(tickItem), 'MMM d, yy');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{format(new Date(label), 'MMM d, yyyy')}</p>
          {data.label && data.label !== 'Today' && data.label !== 'Identified' && (
            <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text)' }}>Step: {data.label}</p>
          )}
          <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontWeight: 'bold' }}>Target Score: {data.targetScore}</p>
          <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>Actual Score: {data.actualScore}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '220px', width: '100%', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
      <h5 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Burndown Timeline</h5>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 15, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis 
            dataKey="date" 
            type="number" 
            domain={['dataMin', 'dataMax']}
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
          />
          <Line 
            name="Actual Risk Score"
            type="stepAfter" 
            dataKey="actualScore" 
            stroke="var(--primary)" 
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--bg)', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskTimeline;
