import React from 'react';
import { ErrorRecoveryPanel } from './ErrorRecoveryPanel/ErrorRecoveryPanel';

export interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  /** Changing this key (e.g., location.pathname) automatically resets the boundary. */
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRecoveryPanelOpen: boolean;
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecoveryPanelOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        error: null,
        isRecoveryPanelOpen: false,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isRecoveryPanelOpen: false,
    });
  };

  handleOpenRecoveryPanel = () => {
    this.setState({ isRecoveryPanelOpen: true });
  };

  handleCloseRecoveryPanel = () => {
    this.setState({ isRecoveryPanelOpen: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="placeholder-container"
          role="alert"
          aria-live="assertive"
          data-testid="route-error-boundary"
        >
          <div className="placeholder-card glass-card">
            <h1 className="placeholder-title">Something went wrong</h1>
            <p className="placeholder-text">
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleRetry}
              >
                Retry
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={this.handleOpenRecoveryPanel}
              >
                Recovery Snapshots
              </button>
            </div>
          </div>
          <ErrorRecoveryPanel
            isOpen={this.state.isRecoveryPanelOpen}
            onClose={this.handleCloseRecoveryPanel}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
