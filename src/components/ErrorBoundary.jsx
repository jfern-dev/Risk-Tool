import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
          <AlertTriangle size={64} color="var(--danger)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ margin: '0 0 1rem 0' }}>Something went wrong.</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '2rem' }}>
            The application encountered an unexpected error. Please try reloading the page.
          </p>
          {this.state.error && (
            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left', maxWidth: '800px', width: '100%', overflowX: 'auto', marginBottom: '2rem' }}>
              <code style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.5rem' }}>{this.state.error.toString()}</code>
              <code style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{this.state.errorInfo?.componentStack}</code>
            </div>
          )}
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
