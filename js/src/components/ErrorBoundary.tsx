import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Use 100% instead of 100vw/100vh for embed containers */
  embedded?: boolean;
  /** Called when an error is caught (e.g. for embed API onError callback) */
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ue-flow render error:', error, info.componentStack);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: this.props.embedded ? '100%' : '100vw',
          height: this.props.embedded ? '100%' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f1117',
          color: '#d4d4d8',
          fontFamily: 'system-ui, sans-serif',
          gap: '12px',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Failed to render blueprint graph</div>
          <div style={{ fontSize: '12px', color: '#71717a', maxWidth: '500px', textAlign: 'center' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '6px 16px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
