import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import RiskTable from './pages/RiskTable';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface)', padding: '1rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>Risk Tool</h1>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
            <Link to="/table" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Data Table</Link>
            <Link to="/admin" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>Admin</Link>
          </nav>
        </div>
      </header>
      <main key={fileKey} style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/table" element={<RiskTable />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />
    </div>
  );
}

function App() {
  const [fileKey, setFileKey] = useState(0);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('file-changed', () => {
        setIsAppReady(true);
        setFileKey(prev => prev + 1);
      });
    }
  }, []);

  if (!isAppReady) {
    return <LandingPage />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <AppContent fileKey={fileKey} />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
