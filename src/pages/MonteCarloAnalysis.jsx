import React, { useState, useEffect, useRef } from 'react';
import { Play, TrendingUp, BarChart2, AlertTriangle, Loader } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';

const MonteCarloAnalysis = () => {
  const [risks, setRisks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);
  const [dataChanged, setDataChanged] = useState(false);
  const [chartView, setChartView] = useState('both');

  const workerRef = useRef(null);

  const generateDataHash = (rData, mappingData) => {
    return JSON.stringify({ risks: rData, mapping: mappingData });
  };

  useEffect(() => {
    // Fetch data on load
    Promise.all([
      apiFetch('http://localhost:3000/api/risks').then(r => r.json()),
      apiFetch('http://localhost:3000/api/dashboardSettings').then(r => r.json()),
      apiFetch('http://localhost:3000/api/simulationCache').then(r => r.json())
    ]).then(([rData, sData, cData]) => {
      let currentRisks = [];
      let currentSettings = null;
      if (Array.isArray(rData)) {
        const mcRisks = rData.filter(r => r.includeInMonteCarlo !== false);
        setRisks(mcRisks);
        currentRisks = mcRisks;
      }
      if (sData && !sData.error) {
        setSettings(sData);
        currentSettings = sData;
      }

      const currentHash = generateDataHash(currentRisks, currentSettings?.probabilityMapping || {});

      if (cData && cData.results) {
        setResults(cData.results);
        if (cData.dataHash !== currentHash) {
          setDataChanged(true);
        }
      }

      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/monteCarloWorker.js', import.meta.url), { type: 'module' });

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.onmessage = async (e) => {
      const newResults = e.data;
      setResults(newResults);
      setSimulating(false);
      setDataChanged(false);

      // Save to cache
      try {
        const hash = generateDataHash(risks, settings?.probabilityMapping || {});
        await apiFetch('http://localhost:3000/api/simulationCache', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: newResults, dataHash: hash })
        });
      } catch (err) {
        console.error('Failed to cache simulation results', err);
      }
    };
  }, [risks, settings]);

  const runSimulation = () => {
    if (!settings?.probabilityMapping) {
      alert("Probability Mapping not found. Please set it in the Admin Panel.");
      return;
    }
    setSimulating(true);
    setResults(null);
    workerRef.current.postMessage({
      risks,
      probabilityMapping: settings.probabilityMapping,
      iterations: 50000 // Run 50k iterations for high confidence
    });
  };

  const formatCurrency = (val) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
    return `${sign}$${Math.round(abs)}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Data...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <TrendingUp size={32} color="var(--primary)" />
          <div>
            <h1 style={{ margin: 0 }}>Monte Carlo Analysis</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>
              Simulate thousands of project outcomes to forecast cost and schedule exposure.
            </p>
          </div>
        </div>
        <button
          className="btn"
          onClick={runSimulation}
          disabled={simulating}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem', background: simulating ? 'var(--border)' : 'var(--primary)' }}
        >
          {simulating ? <Loader size={20} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} /> : <Play size={20} style={{ marginRight: '8px' }} />}
          {simulating ? 'Simulating 50k Iterations...' : 'Run Simulation'}
        </button>
      </div>

      {dataChanged && results && !simulating && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: '2rem' }}>
          <AlertTriangle size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)' }}>Data Has Been Updated</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Risk data or Probability Mappings have changed since the last simulation. <strong>Rerun analysis</strong> to see the latest impact forecasting.
            </p>
          </div>
        </div>
      )}

      {!results && !simulating && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed', borderColor: 'var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <BarChart2 size={48} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>Ready to Simulate</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            Click the "Run Simulation" button above to execute 50,000 randomized project scenarios based on the three-point estimates of your active risks.
          </p>
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
          {/* Compact KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost P50</p>
              <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--primary)', fontSize: '1.2rem' }}>{formatCurrency(results.costStats.p50)}</h3>
            </div>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost P80</p>
              <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--primary)', fontSize: '1.2rem' }}>{formatCurrency(results.costStats.p80)}</h3>
            </div>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost P90</p>
              <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--primary)', fontSize: '1.2rem' }}>{formatCurrency(results.costStats.p90)}</h3>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sched P50</p>
              <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--success)', fontSize: '1.2rem' }}>{Math.round(results.scheduleStats.p50)} Days</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sched P80</p>
              <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--success)', fontSize: '1.2rem' }}>{Math.round(results.scheduleStats.p80)} Days</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sched P90</p>
              <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--success)', fontSize: '1.2rem' }}>{Math.round(results.scheduleStats.p90)} Days</h3>
            </div>
          </div>

          {/* Combined Histogram Chart */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={20} color="var(--primary)" />
                Exposure Distribution
              </h3>
              <select
                value={chartView}
                onChange={(e) => setChartView(e.target.value)}
                className="input"
                style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--surface)', color: 'white' }}
              >
                <option value="both">Show Both</option>
                <option value="cost">Cost Only</option>
                <option value="schedule">Schedule Only</option>
              </select>
            </div>
            <div style={{ width: '100%', height: 450 }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={results.costHistogram.map((ch, i) => ({
                    costBin: ch.binStart, costCount: ch.count, costCum: ch.cumulativeProbability,
                    schedBin: results.scheduleHistogram?.[i]?.binStart || 0, schedCount: results.scheduleHistogram?.[i]?.count || 0, schedCum: results.scheduleHistogram?.[i]?.cumulativeProbability || 0
                  }))}
                  margin={{ top: 30, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  {(chartView === 'both' || chartView === 'cost') && <XAxis xAxisId="cost" dataKey="costBin" orientation="bottom" tickFormatter={val => formatCurrency(val)} stroke="var(--primary)" />}
                  {(chartView === 'both' || chartView === 'schedule') && <XAxis xAxisId="sched" dataKey="schedBin" orientation="top" tickFormatter={val => `${Math.round(val)}d`} stroke="var(--success)" />}
                  <YAxis yAxisId="left" stroke="var(--text-muted)" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--text-muted)" tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    labelFormatter={() => `Exposure Analysis`}
                    formatter={(value, name, props) => {
                      if (name === 'costCount') return [value, `Cost Freq (${formatCurrency(props.payload.costBin)})`];
                      if (name === 'costCum') return [`${value.toFixed(1)}%`, 'Cost Cum. %'];
                      if (name === 'schedCount') return [value, `Sched Freq (${Math.round(props.payload.schedBin)}d)`];
                      if (name === 'schedCum') return [`${value.toFixed(1)}%`, 'Sched Cum. %'];
                      return [value, name];
                    }}
                  />
                  {(chartView === 'both' || chartView === 'cost') && <Bar xAxisId="cost" yAxisId="left" dataKey="costCount" fill="var(--primary)" opacity={0.6} name="costCount" />}
                  {(chartView === 'both' || chartView === 'cost') && <Line xAxisId="cost" yAxisId="right" type="monotone" dataKey="costCum" stroke="var(--primary)" strokeWidth={3} dot={false} name="costCum" />}
                  {(chartView === 'both' || chartView === 'schedule') && <Bar xAxisId="sched" yAxisId="left" dataKey="schedCount" fill="var(--success)" opacity={0.6} name="schedCount" />}
                  {(chartView === 'both' || chartView === 'schedule') && <Line xAxisId="sched" yAxisId="right" type="monotone" dataKey="schedCum" stroke="var(--success)" strokeWidth={3} dot={false} name="schedCum" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
            <AlertTriangle size={24} color="var(--warning)" style={{ flexShrink: 0, marginTop: '4px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Analysis Insight</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.6' }}>
                The simulation executed 50,000 randomized Monte Carlo simulations. Based on the selected distributions and your Probability Mappings, you have an <strong>80% confidence</strong> that total cost impacts will not exceed <strong>{formatCurrency(results.costStats.p80)}</strong> and schedule delays will not exceed <strong>{Math.round(results.scheduleStats.p80)} days</strong>. It is highly recommended to set aside reserves corresponding to the P80 value.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default MonteCarloAnalysis;
