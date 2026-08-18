import React, { useState } from 'react';
import { FilePlus, FolderOpen } from 'lucide-react';

const LandingPage = () => {
  const handleCreateNewFile = () => {
    window.electron.ipcRenderer.invoke('api-new-file');
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
            onClick={handleCreateNewFile}
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

    </div>
  );
};

export default LandingPage;
