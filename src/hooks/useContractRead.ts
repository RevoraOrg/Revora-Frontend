/**
 * React hook for read-only contract calls with loading, error, and retry states
 *
 * Provides a generic hook for fetching contract data with automatic retry logic,
 * loading states, and error handling. Designed for Soroban read-only queries.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseContractReadOptions {
  /** Whether to automatically fetch on mount (default: true) */
  enabled?: boolean;
  /** Number of retry attempts on failure (default: 3) */
  retryCount?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
}

export interface UseContractReadResult<T> {
  /** The fetched data */
  data: T | null;
  /** Whether a fetch is in progress */
  isLoading: boolean;
  /** Whether the last fetch resulted in an error */
  isError: boolean;
  /** The error message if isError is true */
  error: string | null;
  /** Retry the last failed fetch */
  retry: () => void;
  /** Manually trigger a fetch */
  refetch: () => void;
}

/**
 * Generic hook for read-only contract data fetching
 *
 * @param fetchFn - Async function that returns the data
 * @param options - Configuration options
 * @returns Object with data, loading state, error state, and retry/refetch functions
 */
export function useContractRead<T>(
  fetchFn: () => Promise<T>,
  options: UseContractReadOptions = {},
): UseContractReadResult<T> {
  const {
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track retry attempts
  const retryAttempts = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    // Cancel any in-flight request
    if (abortController.current) {
      abortController.current.abort();
    }

    // Create new abort controller for this request
    abortController.current = new AbortController();

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setIsLoading(false);
      retryAttempts.current = 0; // Reset retry counter on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsError(true);
      setIsLoading(false);

      // Automatic retry logic
      if (!isRetry && retryAttempts.current < retryCount) {
        retryAttempts.current += 1;
        setTimeout(() => {
          fetchData(true);
        }, retryDelay);
      }
    }
  }, [fetchFn, retryCount, retryDelay]);

  // Manual retry function
  const retry = useCallback(() => {
    retryAttempts.current = 0;
    fetchData();
  }, [fetchData]);

  // Manual refetch function
  const refetch = useCallback(() => {
    retryAttempts.current = 0;
    fetchData();
  }, [fetchData]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    // Cleanup on unmount
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [enabled, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    retry,
    refetch,
  };
}
