/**
 * React hook for read-only contract calls with loading, error, retry,
 * in-memory caching, in-flight deduplication, TTL, and stale-while-revalidate.
 *
 * Designed for Soroban read-only queries.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const DEFAULT_CACHE_TTL = 30_000;

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

const contractReadCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Invalidate a specific cache entry by key, or clear the entire cache if no key is provided.
 */
export function invalidateContractRead(key?: string): void {
  if (key !== undefined) {
    contractReadCache.delete(key);
    inFlightRequests.delete(key);
    return;
  }
  contractReadCache.clear();
  inFlightRequests.clear();
}

/**
 * Clear all cached contract read entries and in-flight requests (useful in tests).
 */
export function clearContractReadCache(): void {
  contractReadCache.clear();
  inFlightRequests.clear();
}

function executeWithRetry<T>(
  fetchFn: () => Promise<T>,
  retryCount: number,
  retryDelay: number,
  signal?: AbortSignal,
): Promise<T> {
  let attempt = 0;

  const run = (): Promise<T> => {
    if (signal?.aborted) {
      return Promise.reject(new Error('Aborted'));
    }

    return fetchFn().catch((err) => {
      if (signal?.aborted) {
        return Promise.reject(err);
      }

      if (attempt < retryCount) {
        attempt += 1;
        return new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (signal?.aborted) {
              reject(err);
              return;
            }
            run().then(resolve, reject);
          }, retryDelay);

          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(err);
            },
            { once: true },
          );
        });
      }

      return Promise.reject(err);
    });
  };

  return run();
}

export interface UseContractReadOptions {
  /** Optional cache key for sharing, deduplication, and stale-while-revalidate */
  key?: string;
  /** Time-to-live in ms before cached data is considered stale (default: 30000) */
  ttl?: number;
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
  /** Whether a fetch is in progress (false when serving stale cached data) */
  isLoading: boolean;
  /** Whether the last fetch resulted in an error */
  isError: boolean;
  /** The error message if isError is true */
  error: string | null;
  /** Retry the last failed fetch */
  retry: () => void;
  /** Manually trigger a fresh fetch */
  refetch: () => void;
  /** Invalidate the cache entry for this key and trigger a refetch if enabled */
  invalidate: () => void;
}

/**
 * Generic hook for read-only contract data fetching
 *
 * @param fetchFn - Async function that returns the data
 * @param options - Configuration options
 * @returns Object with data, loading state, error state, and retry/refetch/invalidate functions
 */
export function useContractRead<T>(
  fetchFn: () => Promise<T>,
  options: UseContractReadOptions = {},
): UseContractReadResult<T> {
  const {
    key,
    ttl = DEFAULT_CACHE_TTL,
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    if (key !== undefined) {
      const cached = contractReadCache.get(key) as CacheEntry<T> | undefined;
      if (cached) return cached.data;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const requestSeq = useRef(0);

  const runFetch = useCallback(
    async (opts: { background?: boolean; force?: boolean } = {}) => {
      const { background = false, force = false } = opts;
      const seq = ++requestSeq.current;

      if (!background) {
        setIsLoading(true);
      }
      setIsError(false);
      setError(null);

      try {
        let result: T;

        if (key !== undefined) {
          if (force) {
            inFlightRequests.delete(key);
          }

          let promise = inFlightRequests.get(key) as Promise<T> | undefined;
          if (!promise) {
            const rawPromise = executeWithRetry(fetchFn, retryCount, retryDelay);
            promise = rawPromise
              .then((res) => {
                contractReadCache.set(key, { data: res, timestamp: Date.now() });
                return res;
              })
              .finally(() => {
                if (inFlightRequests.get(key) === promise) {
                  inFlightRequests.delete(key);
                }
              });
            inFlightRequests.set(key, promise);
          }

          result = await promise;
        } else {
          if (abortController.current) {
            abortController.current.abort();
          }
          const controller = new AbortController();
          abortController.current = controller;

          result = await executeWithRetry(
            fetchFn,
            retryCount,
            retryDelay,
            controller.signal,
          );
          if (controller.signal.aborted) return;
        }

        if (!isMounted.current || requestSeq.current !== seq) return;
        setData(result);
        setIsLoading(false);
        setIsError(false);
        setError(null);
      } catch (err) {
        if (!isMounted.current || requestSeq.current !== seq) return;
        if (key === undefined && abortController.current?.signal.aborted) return;

        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setIsError(true);
        setIsLoading(false);
      }
    },
    [fetchFn, key, retryCount, retryDelay],
  );

  const retry = useCallback(() => {
    void runFetch({ force: true });
  }, [runFetch]);

  const refetch = useCallback(() => {
    void runFetch({ force: true });
  }, [runFetch]);

  const invalidate = useCallback(() => {
    if (key !== undefined) {
      invalidateContractRead(key);
    }
    if (enabled) {
      void runFetch({ force: true });
    }
  }, [enabled, key, runFetch]);

  useEffect(() => {
    isMounted.current = true;

    if (enabled) {
      if (key !== undefined) {
        const cached = contractReadCache.get(key) as CacheEntry<T> | undefined;
        if (cached) {
          setData(cached.data);
          setIsError(false);
          setError(null);
          setIsLoading(false);

          const isFresh = Date.now() - cached.timestamp < ttl;
          if (!isFresh) {
            void runFetch({ background: true });
          }
        } else {
          void runFetch();
        }
      } else {
        void runFetch();
      }
    }

    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [enabled, key, ttl, runFetch]);

  return {
    data,
    isLoading,
    isError,
    error,
    retry,
    refetch,
    invalidate,
  };
}
