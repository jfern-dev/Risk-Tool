import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RiskTable from './pages/RiskTable';
import AdminPage from './pages/AdminPage';
import './index.css';

function App() {
  const [fileKey, setFileKey] = useState(0);

  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('file-changed', () => {
        setFileKey(prev => prev + 1);
      });
    }
  }, []);

  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'var(--surface)', padding: '1rem 2rem', borderBottom: '1px solid var(--border)' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>ERM Tool</h1>
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
      </div>
    </Router>
  );
}

export default App;
