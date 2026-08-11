import React, { useState } from 'react';
import { FilePlus, FolderOpen } from 'lucide-react';

const LandingPage = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  const handleCreateNewFile = () => {
    window.electron.ipcRenderer.invoke('api-new-file', password);
    setShowPasswordModal(false);
  };
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--text)',
      padding: '2rem'
    }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '2.5rem', fontWeight: 'bold' }}>
          Enterprise Risk Management Tool
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem' }}>
          Welcome! To get started, please create a new workspace or open an existing file.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <button
            className="btn"
            style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            onClick={() => setShowPasswordModal(true)}
          >
            <FilePlus size={24} />
            New
          </button>
          
          <button
            className="btn"
            style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', background: 'transparent', color: 'var(--primary)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            onClick={() => window.electron.ipcRenderer.invoke('api-open-file')}
          >
            <FolderOpen size={24} />
            Open
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Set Admin Password</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Create a password to protect the Admin settings for this workspace.
            </p>
            <input
              type="password"
              className="form-input"
              style={{ marginBottom: '1.5rem' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="btn" onClick={handleCreateNewFile}>Create Workspace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
