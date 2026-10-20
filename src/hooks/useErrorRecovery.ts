import { useState, useCallback, useEffect, useRef } from 'react';

export type ErrorScope = 'inline' | 'modal' | 'page';
export type ErrorCategory = 'network' | 'rpc' | 'wallet' | 'server' | 'validation' | 'generic' | 'custom';

export interface DiagnosedErrorInfo {
  message: string;
  title?: string;
  errorType: ErrorCategory;
  errorCode?: string | number;
  txHash?: string;
  timestamp?: string;
  details?: string | Record<string, unknown> | null;
}

export interface UseErrorRecoveryOptions {
  maxRetries?: number;
  cooldownSeconds?: number;
  initialError?: unknown;
  onRetry?: () => void | Promise<void>;
}

export interface UseErrorRecoveryReturn {
  error: DiagnosedErrorInfo | null;
  rawError: unknown;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  cooldown: number;
  canRetry: boolean;
  setError: (err: unknown) => void;
  clearError: () => void;
  triggerRetry: (retryFn?: () => void | Promise<void>) => Promise<boolean>;
}

/**
 * Automatically inspects and categorizes errors (network, RPC, wallet rejection, 5xx server).
 */
export function categorizeError(err: unknown): DiagnosedErrorInfo {
  if (!err) {
    return {
      message: 'An unknown error occurred',
      errorType: 'generic',
      timestamp: new Date().toISOString(),
    };
  }

  const timestamp = new Date().toISOString();

  // If string
  if (typeof err === 'string') {
    const lower = err.toLowerCase();
    let errorType: ErrorCategory = 'generic';
    let title: string | undefined;

    if (lower.includes('network') || lower.includes('offline') || lower.includes('fetch') || lower.includes('timeout')) {
      errorType = 'network';
      title = 'Network Connection Error';
    } else if (lower.includes('rpc') || lower.includes('node') || lower.includes('stellar') || lower.includes('horizon') || lower.includes('soroban')) {
      errorType = 'rpc';
      title = 'Blockchain RPC Error';
    } else if (lower.includes('reject') || lower.includes('denied') || lower.includes('wallet') || lower.includes('user cancelled') || lower.includes('user rejected')) {
      errorType = 'wallet';
      title = 'Transaction Rejected';
    } else if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('server')) {
      errorType = 'server';
      title = 'Server Error';
    } else if (lower.includes('validation') || lower.includes('invalid') || lower.includes('required')) {
      errorType = 'validation';
      title = 'Validation Error';
    }

    return {
      message: err,
      title,
      errorType,
      timestamp,
      details: err,
    };
  }

  // If Error instance or object
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;
    const message = typeof errorObj.message === 'string'
      ? errorObj.message
      : typeof errorObj.error === 'string'
        ? errorObj.error
        : 'An error occurred during this operation.';

    const code = errorObj.code || errorObj.status || errorObj.errorCode;
    const errorCode = typeof code === 'string' || typeof code === 'number' ? code : undefined;
    const txHash = typeof errorObj.txHash === 'string'
      ? errorObj.txHash
      : typeof errorObj.hash === 'string'
        ? errorObj.hash
        : typeof errorObj.transactionHash === 'string'
          ? errorObj.transactionHash
          : undefined;

    const lower = `${message} ${errorCode || ''}`.toLowerCase();
    let errorType: ErrorCategory = 'generic';
    let title: string | undefined;

    // Check numeric status or code first
    const isServerError =
      (typeof errorCode === 'number' && errorCode >= 500 && errorCode < 600) ||
      (typeof code === 'number' && code >= 500 && code < 600) ||
      lower.includes('500') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('504') ||
      lower.includes('internal server error') ||
      lower.includes('bad gateway') ||
      lower.includes('service unavailable') ||
      lower.includes('gateway timeout');

    if (
      lower.includes('wallet') ||
      lower.includes('user reject') ||
      lower.includes('user denied') ||
      lower.includes('4001') ||
      errorCode === 4001 ||
      errorCode === 'ACTION_REJECTED'
    ) {
      errorType = 'wallet';
      title = 'Wallet Transaction Rejected';
    } else if (
      lower.includes('rpc') ||
      lower.includes('node') ||
      lower.includes('stellar') ||
      lower.includes('horizon') ||
      lower.includes('soroban') ||
      errorCode === 'RPC_ERROR'
    ) {
      errorType = 'rpc';
      title = 'Blockchain RPC Error';
    } else if (isServerError) {
      errorType = 'server';
      title = 'Server Error (5xx)';
    } else if (
      lower.includes('network') ||
      lower.includes('offline') ||
      lower.includes('timeout') ||
      lower.includes('econnrefused') ||
      errorCode === 'ERR_NETWORK' ||
      errorCode === 'ETIMEDOUT'
    ) {
      errorType = 'network';
      title = 'Network Connection Error';
    } else if (
      lower.includes('validation') ||
      lower.includes('invalid') ||
      (typeof errorCode === 'number' && errorCode === 422)
    ) {
      errorType = 'validation';
      title = 'Validation Error';
    }

    return {
      message,
      title,
      errorType,
      errorCode,
      txHash,
      timestamp,
      details: typeof errorObj.stack === 'string' ? errorObj.stack : JSON.stringify(errorObj, null, 2),
    };
  }

  return {
    message: String(err),
    errorType: 'generic',
    timestamp,
    details: String(err),
  };
}

/**
 * useErrorRecovery
 * Custom hook to encapsulate error state diagnosis, retry counter, cooldown timers,
 * and form preservation workflows across transient network and on-chain failures.
 */
export function useErrorRecovery(options: UseErrorRecoveryOptions = {}): UseErrorRecoveryReturn {
  const { maxRetries = 3, cooldownSeconds = 0, initialError = null, onRetry } = options;

  const [rawError, setRawError] = useState<unknown>(initialError);
  const [error, setDiagnosedError] = useState<DiagnosedErrorInfo | null>(() =>
    initialError ? categorizeError(initialError) : null
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [cooldown, setCooldown] = useState<number>(0);

  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setError = useCallback((err: unknown) => {
    setRawError(err);
    if (!err) {
      setDiagnosedError(null);
    } else {
      setDiagnosedError(categorizeError(err));
    }
  }, []);

  const clearError = useCallback(() => {
    setRawError(null);
    setDiagnosedError(null);
    setCooldown(0);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  // Cooldown countdown handler
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldown]);

  const canRetry = retryCount < maxRetries && cooldown === 0 && !isRetrying;

  const triggerRetry = useCallback(
    async (retryFn?: () => void | Promise<void>): Promise<boolean> => {
      if (!canRetry) return false;

      const fn = retryFn || onRetry;
      if (!fn) return false;

      setIsRetrying(true);
      setRetryCount((prev) => prev + 1);

      try {
        await fn();
        // If successful without throwing, clear error
        clearError();
        setIsRetrying(false);
        return true;
      } catch (err) {
        setError(err);
        setIsRetrying(false);
        if (cooldownSeconds > 0) {
          setCooldown(cooldownSeconds);
        }
        return false;
      }
    },
    [canRetry, onRetry, clearError, setError, cooldownSeconds]
  );

  return {
    error,
    rawError,
    isRetrying,
    retryCount,
    maxRetries,
    cooldown,
    canRetry,
    setError,
    clearError,
    triggerRetry,
  };
}
