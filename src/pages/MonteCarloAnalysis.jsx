import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, TrendingUp, BarChart2, AlertTriangle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../utils/api';
import { runMonteCarloSimulation } from '../utils/mcEngine';
import MonteCarloWorker from '../workers/monteCarloWorker.js?worker';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';

const defaultProbMapping = {
  1: { min: 1, max: 20 },
  2: { min: 21, max: 40 },
  3: { min: 41, max: 60 },
  4: { min: 61, max: 80 },
  5: { min: 81, max: 99 }
};

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
      apiFetch('/api/risks').then(r => r.json()),
      apiFetch('/api/dashboardSettings').then(r => r.json()),
      apiFetch('/api/simulationCache').then(r => r.json())
    ]).then(([rData, sData, cData]) => {
      let currentRisks = [];
      let currentSettings = null;
      if (Array.isArray(rData)) {
        const mcRisks = rData.filter(r => r && r.includeInMonteCarlo !== false);
        setRisks(mcRisks);
        currentRisks = mcRisks;
      }
      if (sData && !sData.error) {
        setSettings(sData);
        currentSettings = sData;
      }

      const probMap = currentSettings?.probabilityMapping || defaultProbMapping;
      const currentHash = generateDataHash(currentRisks, probMap);

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

    // Initialize Web Worker if supported
    try {
      workerRef.current = new MonteCarloWorker();
    } catch (err) {
      console.warn('Web Worker initialization failed, using main thread fallback:', err);
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const handleSimulationComplete = useCallback(async (newResults, probMap) => {
    setResults(newResults);
    setSimulating(false);
    setDataChanged(false);
    toast.success('Monte Carlo simulation completed!');

    // Save to cache
    try {
      const hash = generateDataHash(risks, probMap);
      await apiFetch('/api/simulationCache', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: newResults, dataHash: hash })
      });
    } catch (err) {
      console.error('Failed to cache simulation results', err);
    }
  }, [risks]);

  useEffect(() => {
    if (!workerRef.current) return;
    const probMap = settings?.probabilityMapping || defaultProbMapping;
    
    workerRef.current.onmessage = (e) => {
      if (e.data && e.data.error) {
        console.error('Worker simulation error, falling back to main thread:', e.data.error);
        const fallbackResults = runMonteCarloSimulation(risks, probMap, 50000);
        handleSimulationComplete(fallbackResults, probMap);
      } else {
        handleSimulationComplete(e.data, probMap);
      }
    };

    workerRef.current.onerror = (err) => {
      console.error('Worker error event, falling back to main thread:', err);
      const fallbackResults = runMonteCarloSimulation(risks, probMap, 50000);
      handleSimulationComplete(fallbackResults, probMap);
    };
  }, [risks, settings, handleSimulationComplete]);

  const runSimulation = () => {
    const probMap = settings?.probabilityMapping || defaultProbMapping;
    setSimulating(true);
    setResults(null);

    if (workerRef.current) {
      try {
        workerRef.current.postMessage({
          risks,
          probabilityMapping: probMap,
          iterations: 50000
        });
      } catch (err) {
        console.warn('Worker postMessage failed, running on main thread:', err);
        setTimeout(() => {
          const res = runMonteCarloSimulation(risks, probMap, 50000);
          handleSimulationComplete(res, probMap);
        }, 50);
      }
    } else {
      setTimeout(() => {
        const res = runMonteCarloSimulation(risks, probMap, 50000);
        handleSimulationComplete(res, probMap);
      }, 50);
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$0';
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
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <TrendingUp size={26} color="var(--primary)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Monte Carlo Analysis</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '2px', fontSize: '0.85rem' }}>
              Simulate thousands of project outcomes to forecast cost and schedule exposure.
            </p>
          </div>
        </div>
        <button
          className="btn"
          onClick={runSimulation}
          disabled={simulating}
          style={{ padding: '0.45rem 1rem', fontSize: '0.95rem', background: simulating ? 'var(--border)' : 'var(--primary)' }}
        >
          {simulating ? <Loader size={16} style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} /> : <Play size={16} style={{ marginRight: '6px' }} />}
          {simulating ? 'Simulating 50k Iterations...' : 'Run Simulation'}
        </button>
      </div>

      {dataChanged && results && !simulating && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: '1rem', padding: '0.65rem 1rem' }}>
          <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 0.15rem 0', color: 'var(--text)', fontSize: '0.9rem' }}>Data Has Been Updated</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Risk data or Probability Mappings have changed since the last simulation. <strong>Rerun analysis</strong> to see the latest impact forecasting.
            </p>
          </div>
        </div>
      )}

      {!results && !simulating && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderStyle: 'dashed', borderColor: 'var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <BarChart2 size={36} color="var(--primary)" style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem' }}>Ready to Simulate</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', fontSize: '0.85rem' }}>
            Click the "Run Simulation" button above to execute 50,000 randomized project scenarios based on the three-point estimates of your active risks.
          </p>
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.4s ease' }}>
          {/* Compact KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.65rem' }}>
            <div className="stat-card">
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost P50 (Median)</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(results.costStats.p50)}</h3>
            </div>
            <div className="stat-card">
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost P80 (Likely)</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(results.costStats.p80)}</h3>
            </div>
            <div className="stat-card">
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost P90 (Conservative)</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(results.costStats.p90)}</h3>
            </div>

            <div className="stat-card">
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sched P50 (Median)</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--success)', fontSize: '1.2rem', fontWeight: 700 }}>{Math.round(results.scheduleStats.p50)} Days</h3>
            </div>
            <div className="stat-card">
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sched P80 (Likely)</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--success)', fontSize: '1.2rem', fontWeight: 700 }}>{Math.round(results.scheduleStats.p80)} Days</h3>
            </div>
            <div className="stat-card">
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sched P90 (Conservative)</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--success)', fontSize: '1.2rem', fontWeight: 700 }}>{Math.round(results.scheduleStats.p90)} Days</h3>
            </div>
          </div>

          {/* Combined Histogram Chart */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <BarChart2 size={18} color="var(--primary)" />
                Exposure Distribution
              </h3>
              <select
                value={chartView}
                onChange={(e) => setChartView(e.target.value)}
                className="input"
                style={{ width: 'auto', padding: '0.25rem 0.6rem', background: 'var(--surface)', color: 'white', fontSize: '0.85rem' }}
              >
                <option value="both">Show Both</option>
                <option value="cost">Cost Only</option>
                <option value="schedule">Schedule Only</option>
              </select>
            </div>
            <div style={{ width: '100%', height: 380 }}>
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
