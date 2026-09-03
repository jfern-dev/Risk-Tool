import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Shield, 
  LayoutDashboard, 
  Table2, 
  CalendarClock, 
  TrendingUp, 
  Settings, 
  
  
  
  
  
  
  
  
  Presentation,
  Layout
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import RiskTable from './pages/RiskTable';
import AdminPage from './pages/AdminPage';
import MonteCarloAnalysis from './pages/MonteCarloAnalysis';
import ScheduleView from './pages/ScheduleView';
import Briefing from './pages/Briefing';
import BriefingAdmin from './pages/BriefingAdmin';
import ErrorBoundary from './components/ErrorBoundary';
import { apiFetch } from './utils/api';
import packageJson from '../package.json';
import './index.css';

function AppContent({ fileKey }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [sysInfo, setSysInfo] = useState({ username: '...', lastSync: 0, lastArchive: 0 });

  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const res = await apiFetch('/api/system-info');
        const data = await res.json();
        if (data && !data.error) setSysInfo(data);
      } catch (e) {}
    };
    fetchSysInfo();
    const interval = setInterval(fetchSysInfo, 3000);
    return () => clearInterval(interval);
  }, [fileKey]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch('/api/dashboardSettings');
        const data = await res.json();
        if (data && !data.error) setSettings(data);
      } catch (err) {
        console.error('Failed to load dashboard settings in App:', err);
      }
    };
    loadSettings();

    const onSettingsUpdate = () => loadSettings();
    window.addEventListener('settings-updated', onSettingsUpdate);
    return () => window.removeEventListener('settings-updated', onSettingsUpdate);
  }, [fileKey]);

  const handleFileAction = async (action) => {
    try {
      if (action === 'new') {
        await window.electron.ipcRenderer.invoke('api-new-file');
        toast.success('New workspace created');
        navigate('/');
      }
      if (action === 'open') {
        const opened = await window.electron.ipcRenderer.invoke('api-open-file');
        if (opened) {
          toast.success('Workspace opened successfully');
          navigate('/');
        }
      }
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
      console.error(err); toast.error('File operation failed');
    }
  };

  const enabledModules = settings?.enabledModules || {};
  const unlockedModules = settings?.unlockedModules || ['rio'];
  const isUnlocked = (mod) => unlockedModules.includes(mod);

  const navItems = [
    ...(enabledModules.rio !== false ? [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/table', label: 'Data Table', icon: Table2 }
    ] : []),
    ...(enabledModules.schedule && isUnlocked('schedule') ? [{ path: '/schedule', label: 'Schedule', icon: CalendarClock }] : []),
    ...(enabledModules.monteCarlo && isUnlocked('monteCarlo') ? [{ path: '/montecarlo', label: 'Monte Carlo', icon: TrendingUp }] : []),
    ...(enabledModules.briefing && isUnlocked('briefing') ? [{ path: '/briefing', label: 'Briefing', icon: Presentation }] : []),
    ...(enabledModules.briefingAdmin && isUnlocked('briefingAdmin') ? [{ path: '/briefing-admin', label: 'Briefing Admin', icon: Layout }] : []),
    { path: '/admin', label: 'Admin', icon: Settings },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface)', padding: '0.45rem 1.5rem', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0' }}>
          
          {/* Brand & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px var(--primary-glow)' }}>
                <Shield size={16} color="white" />
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#FFFFFF' }}>Risk Tool</span>
                <span style={{ fontSize: '0.7rem', marginLeft: '0.45rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-hover)', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.3)' }}>ERM</span>
              </div>
            </Link>

            <div style={{ position: 'relative' }}>
              <select
                className="form-input"
                style={{ padding: '0.3rem 0.65rem', width: 'auto', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--glass-border)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 500, borderRadius: '6px' }}
                value=""
                onChange={(e) => {
                  const action = e.target.value;
                  if (['new', 'open', 'save', 'save-as', 'import-mpp'].includes(action)) {
                    handleFileAction(action);
                  } else {
                    window.dispatchEvent(new CustomEvent('app-action', { detail: action }));
                  }
                  e.target.value = '';
                }}
              >
                <option value="" disabled>📁 Data Actions...</option>
                <option value="new">➕ Create New Workspace</option>
                <option value="open">📂 Open Workspace...</option>
                <option value="save">💾 Save Workspace</option>
                <option value="save-as">💾 Save Workspace As...</option>
                <option disabled>──────────</option>
                <option value="import-mpp">📊 Import MS Project (.mpp)</option>
                <option disabled>──────────</option>
                <option value="snapshot">📸 Create Global Snapshot...</option>
                <option value="csv">📑 Export to CSV</option>
                <option value="print">🖨️ Export to PDF (Print)</option>
              </select>
            </div>
            
            {/* System Info */}
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-hover)' }}>👤 {sysInfo.username}</span>
                <span title="Last Sync (Automerge)">
                  🔄 {sysInfo.lastSync ? new Date(sysInfo.lastSync).toLocaleTimeString() : 'Never'}
                </span>
                <span title="Last Archive">
                  📦 {sysInfo.lastArchive ? new Date(sysInfo.lastArchive).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`nav-pill ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main key={fileKey} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route 
            path="/" 
            element={enabledModules.rio !== false ? <Dashboard /> : <Navigate to={navItems.length > 0 ? navItems[0].path : '/admin'} replace />} 
          />
          <Route 
            path="/table" 
            element={enabledModules.rio !== false ? <RiskTable /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/schedule" 
            element={enabledModules.schedule && isUnlocked('schedule') ? <ScheduleView /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/montecarlo" 
            element={enabledModules.monteCarlo && isUnlocked('monteCarlo') ? <MonteCarloAnalysis /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/briefing" 
            element={enabledModules.briefing && isUnlocked('briefing') ? <Briefing /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/briefing-admin" 
            element={enabledModules.briefingAdmin && isUnlocked('briefingAdmin') ? <BriefingAdmin /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/admin" 
            element={<AdminPage />} 
          />
        </Routes>
      </main>
      <footer style={{
        padding: '0.4rem 1.5rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        backdropFilter: 'blur(16px)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Risk Tool</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>Enterprise Risk Management</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono, monospace)', opacity: 0.85 }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
          <span>v{packageJson.version}</span>
        </div>
      </footer>
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
