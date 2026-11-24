import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../../utils/reportError';
import '../ErrorRecoveryPanel/ErrorRecoveryPanel.css';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this value (e.g. router location key) resets any caught error state. */
  resetKey?: string | number;
  /** Optional callback invoked when an error is caught. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportError(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="error-boundary-panel"
          style={{ maxWidth: '32rem', margin: '2rem auto', padding: '0 1rem' }}
        >
          <div className="error-item-card">
            <div className="error-item-main">
              <h2 className="error-item-title">Something went wrong</h2>
              <p className="error-item-desc">
                {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
              </p>
            </div>
            <div className="error-item-actions">
              <button
                type="button"
                className="error-btn-primary"
                onClick={this.resetErrorBoundary}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
