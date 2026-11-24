import type { ErrorInfo } from 'react';

/**
 * Centralized error reporting function for application errors caught by ErrorBoundary.
 */
export function reportError(error: Error, errorInfo?: ErrorInfo): void {
  console.error('[ErrorBoundary]', error, errorInfo);
}
