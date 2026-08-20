import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import RiskTable from './pages/RiskTable';
import AdminPage from './pages/AdminPage';
import MonteCarloAnalysis from './pages/MonteCarloAnalysis';
import ScheduleView from './pages/ScheduleView';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function AppContent({ fileKey }) {
  const navigate = useNavigate();
  const prevFileKey = React.useRef(fileKey);

  useEffect(() => {
    // Only navigate to Dashboard if the fileKey actually changed (meaning a file was opened/created)
    if (prevFileKey.current !== fileKey) {
      navigate('/');
      prevFileKey.current = fileKey;
    }
  }, [fileKey, navigate]);

  const handleFileAction = async (action) => {
    try {
      if (action === 'new') await window.electron.ipcRenderer.invoke('api-new-file');
      if (action === 'open') await window.electron.ipcRenderer.invoke('api-open-file');
      if (action === 'save') {
        const saved = await window.electron.ipcRenderer.invoke('api-save');
        if (saved) toast.success('Workspace saved successfully');
      }
      if (action === 'save-as') {
        const saved = await window.electron.ipcRenderer.invoke('api-save-as');
        if (saved) toast.success('Workspace saved successfully');
      }
      if (action === 'import-mpp') {
        const schedule = await window.electron.ipcRenderer.invoke('api-import-mpp');
        if (schedule) {
          toast.success('MS Project schedule imported successfully');
          navigate('/schedule');
        }
      }
    } catch (err) {
      toast.error('File operation failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface)', padding: '1rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>Risk Tool</h1>
            <select
              className="form-input"
              style={{ padding: '0.5rem', width: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
              value=""
              onChange={(e) => {
                const action = e.target.value;
                if (['new', 'open', 'save', 'save-as'].includes(action)) {
                  handleFileAction(action);
                } else {
                  window.dispatchEvent(new CustomEvent('app-action', { detail: action }));
                }
                e.target.value = '';
              }}
            >
              <option value="" disabled>Data Actions...</option>
              <option value="new">Create New Workspace</option>
              <option value="open">Open Workspace...</option>
              <option value="save">Workspace Save</option>
              <option value="save-as">Workspace Save As...</option>
              <option disabled>---</option>
              <option value="import-mpp">Import MS Project (.mpp)</option>
              <option disabled>---</option>
              <option value="snapshot">Create Global Snapshot...</option>
              <option value="csv">Export to CSV</option>
              <option value="print">Export to PDF (Print)</option>
            </select>
          </div>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
            <Link to="/table" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Data Table</Link>
            <Link to="/schedule" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Schedule</Link>
            <Link to="/montecarlo" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Monte Carlo</Link>
            <Link to="/admin" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Admin</Link>
          </nav>
        </div>
      </header>
      <main key={fileKey} style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/table" element={<RiskTable />} />
          <Route path="/schedule" element={<ScheduleView />} />
          <Route path="/montecarlo" element={<MonteCarloAnalysis />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />
    </div>
  );
}

function App() {
  const [fileKey, setFileKey] = useState(0);
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('file-changed', () => {
        setFileKey(prev => prev + 1);
      });
      return () => {
        window.electron.ipcRenderer.removeAllListeners('file-changed');
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AppContent fileKey={fileKey} />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
