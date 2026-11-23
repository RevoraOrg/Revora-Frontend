/**
 * Unit tests for useContractRead hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useContractRead,
  clearContractReadCache,
  invalidateContractRead,
} from './useContractRead';

describe('useContractRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearContractReadCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearContractReadCache();
  });

  it('initially returns loading state and null data', () => {
    const fetchFn = vi.fn(() => Promise.resolve('data'));
    const { result } = renderHook(() => useContractRead(fetchFn));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('successfully fetches data', async () => {
    const mockData = { value: 123 };
    const fetchFn = vi.fn(() => Promise.resolve(mockData));
    const { result } = renderHook(() => useContractRead(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors', async () => {
    const errorMessage = 'Network error';
    const fetchFn = vi.fn(() => Promise.reject(new Error(errorMessage)));
    const { result } = renderHook(() => useContractRead(fetchFn, { retryCount: 0 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(errorMessage);
  });

  it('does not auto-fetch when disabled', async () => {
    const fetchFn = vi.fn(() => Promise.resolve('data'));
    const { result } = renderHook(() => useContractRead(fetchFn, { enabled: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 100 });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.data).toBe(null);
  });

  it('retries on failure with default retry count', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockRejectedValueOnce(new Error('Error 3'))
      .mockResolvedValueOnce('success');

    const { result } = renderHook(() => useContractRead(fetchFn, { retryCount: 3, retryDelay: 10 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 1000 });

    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(result.current.data).toBe('success');
    expect(result.current.isError).toBe(false);
  });

  it('stops retrying after max retry count', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new Error('Persistent error')));
    const { result } = renderHook(() => useContractRead(fetchFn, { retryCount: 2, retryDelay: 10 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 100 });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe('Persistent error');
  });

  it('manual retry function works', async () => {
    let shouldFail = true;
    const fetchFn = vi.fn(() => {
      if (shouldFail) {
        return Promise.reject(new Error('First failure'));
      }
      return Promise.resolve('success');
    });

    const { result } = renderHook(() => useContractRead(fetchFn, { retryCount: 0 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      shouldFail = false;
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe('success');
    expect(result.current.isError).toBe(false);
  });

  it('manual refetch function works', async () => {
    const fetchFn = vi.fn(() => Promise.resolve('data'));
    const { result } = renderHook(() => useContractRead(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('cancels in-flight request on unmount', async () => {
    const fetchFn = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve('data'), 1000)));
    const { result, unmount } = renderHook(() => useContractRead(fetchFn));

    expect(result.current.isLoading).toBe(true);

    unmount();

    expect(result.current.isLoading).toBe(true);
  });

  it('respects custom retry delay', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockResolvedValueOnce('success');

    const startTime = Date.now();
    const { result } = renderHook(() => useContractRead(fetchFn, { retryCount: 1, retryDelay: 100 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 500 });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  describe('caching, deduplication, TTL, and stale-while-revalidate', () => {
    it('deduplicates concurrent hooks with the same key into one fetch', async () => {
      let resolveFetch!: (value: string) => void;
      const fetchFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveFetch = resolve;
          }),
      );

      const hookA = renderHook(() =>
        useContractRead(fetchFn, { key: 'shared-key', retryCount: 0 }),
      );
      const hookB = renderHook(() =>
        useContractRead(fetchFn, { key: 'shared-key', retryCount: 0 }),
      );

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(hookA.result.current.isLoading).toBe(true);
      expect(hookB.result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFetch('shared-result');
      });

      expect(hookA.result.current.isLoading).toBe(false);
      expect(hookA.result.current.data).toBe('shared-result');
      expect(hookB.result.current.isLoading).toBe(false);
      expect(hookB.result.current.data).toBe('shared-result');
    });

    it('serves cached data within TTL without refetching', async () => {
      vi.useFakeTimers();
      const fetchFn = vi.fn().mockResolvedValue('cached-value');

      const hookA = renderHook(() =>
        useContractRead(fetchFn, { key: 'ttl-key', ttl: 5000, retryCount: 0 }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(hookA.result.current.data).toBe('cached-value');

      // Advance within TTL
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      const hookB = renderHook(() =>
        useContractRead(fetchFn, { key: 'ttl-key', ttl: 5000, retryCount: 0 }),
      );

      expect(hookB.result.current.isLoading).toBe(false);
      expect(hookB.result.current.data).toBe('cached-value');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('shows stale data while revalidating after TTL expires', async () => {
      vi.useFakeTimers();
      let resolveRevalidate!: (value: string) => void;
      const fetchFn = vi
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce('initial-value')
        .mockImplementationOnce(
          () =>
            new Promise<string>((resolve) => {
              resolveRevalidate = resolve;
            }),
        );

      const hookA = renderHook(() =>
        useContractRead(fetchFn, { key: 'swr-key', ttl: 1000, retryCount: 0 }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(hookA.result.current.data).toBe('initial-value');
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Advance past TTL
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      const hookB = renderHook(() =>
        useContractRead(fetchFn, { key: 'swr-key', ttl: 1000, retryCount: 0 }),
      );

      // Immediately shows stale data without loading state while revalidating
      expect(hookB.result.current.data).toBe('initial-value');
      expect(hookB.result.current.isLoading).toBe(false);
      expect(fetchFn).toHaveBeenCalledTimes(2);

      // Complete background revalidation
      await act(async () => {
        resolveRevalidate('fresh-value');
      });

      expect(hookB.result.current.data).toBe('fresh-value');
      expect(hookB.result.current.isLoading).toBe(false);
    });

    it('supports manual invalidate on the hook and invalidateContractRead by key', async () => {
      vi.useFakeTimers();
      const fetchFn = vi
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce('v1')
        .mockResolvedValueOnce('v2')
        .mockResolvedValueOnce('v3');

      const { result } = renderHook(() =>
        useContractRead(fetchFn, { key: 'inv-key', ttl: 60_000, retryCount: 0 }),
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.data).toBe('v1');
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.invalidate();
        await Promise.resolve();
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(result.current.data).toBe('v2');

      // Programmatic invalidation causes next mount to fetch v3
      invalidateContractRead('inv-key');
      const hookB = renderHook(() =>
        useContractRead(fetchFn, { key: 'inv-key', ttl: 60_000, retryCount: 0 }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetchFn).toHaveBeenCalledTimes(3);
      expect(hookB.result.current.data).toBe('v3');
    });

    it('preserves retry semantics for keyed deduplicated reads', async () => {
      vi.useFakeTimers();
      const fetchFn = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce('recovered');

      const hookA = renderHook(() =>
        useContractRead(fetchFn, {
          key: 'retry-key',
          retryCount: 1,
          retryDelay: 500,
        }),
      );
      const hookB = renderHook(() =>
        useContractRead(fetchFn, {
          key: 'retry-key',
          retryCount: 1,
          retryDelay: 500,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(hookA.result.current.isLoading).toBe(true);
      expect(hookB.result.current.isLoading).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(hookA.result.current.isLoading).toBe(false);
      expect(hookA.result.current.data).toBe('recovered');
      expect(hookB.result.current.isLoading).toBe(false);
      expect(hookB.result.current.data).toBe('recovered');
    });

    it('completes shared in-flight request for remaining hook when one unmounts', async () => {
      let resolveFetch!: (value: string) => void;
      const fetchFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveFetch = resolve;
          }),
      );

      const hookA = renderHook(() =>
        useContractRead(fetchFn, { key: 'unmount-key', retryCount: 0 }),
      );
      const hookB = renderHook(() =>
        useContractRead(fetchFn, { key: 'unmount-key', retryCount: 0 }),
      );

      hookA.unmount();

      await act(async () => {
        resolveFetch('still-delivered');
      });

      expect(hookB.result.current.isLoading).toBe(false);
      expect(hookB.result.current.data).toBe('still-delivered');
    });
  });
});
