import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useErrorRecovery, categorizeError } from './useErrorRecovery';

describe('categorizeError helper', () => {
  it('returns generic error when passed null or undefined', () => {
    const res = categorizeError(null);
    expect(res.errorType).toBe('generic');
    expect(res.message).toBe('An unknown error occurred');
  });

  it('correctly categorizes network string errors', () => {
    const res = categorizeError('Network timeout while connecting to server');
    expect(res.errorType).toBe('network');
    expect(res.title).toBe('Network Connection Error');
  });

  it('correctly categorizes RPC/node string errors', () => {
    const res = categorizeError('Stellar RPC node response timed out');
    expect(res.errorType).toBe('rpc');
    expect(res.title).toBe('Blockchain RPC Error');
  });

  it('correctly categorizes wallet rejection string errors', () => {
    const res = categorizeError('User rejected wallet signature request');
    expect(res.errorType).toBe('wallet');
    expect(res.title).toBe('Transaction Rejected');
  });

  it('correctly categorizes server 5xx string errors', () => {
    const res = categorizeError('Server returned 503 Service Unavailable');
    expect(res.errorType).toBe('server');
    expect(res.title).toBe('Server Error');
  });

  it('correctly categorizes validation string errors', () => {
    const res = categorizeError('Form validation failed: amount is required');
    expect(res.errorType).toBe('validation');
    expect(res.title).toBe('Validation Error');
  });

  it('correctly extracts errorCode, txHash, and details from error objects', () => {
    const errorObj = {
      message: 'Transaction submission rejected by user',
      code: 4001,
      txHash: '0x1234567890abcdef',
      stack: 'Error: Transaction submission rejected...',
    };

    const res = categorizeError(errorObj);
    expect(res.errorType).toBe('wallet');
    expect(res.errorCode).toBe(4001);
    expect(res.txHash).toBe('0x1234567890abcdef');
    expect(res.details).toBe(errorObj.stack);
  });

  it('handles object with generic error code and 500 status', () => {
    const errorObj = {
      message: 'Internal Gateway Timeout',
      status: 504,
    };

    const res = categorizeError(errorObj);
    expect(res.errorType).toBe('server');
    expect(res.errorCode).toBe(504);
  });

  it('categorizes number or boolean primitive errors', () => {
    const res1 = categorizeError(500);
    expect(res1.errorType).toBe('generic');
    expect(res1.message).toBe('500');

    const res2 = categorizeError(true);
    expect(res2.errorType).toBe('generic');
    expect(res2.message).toBe('true');
  });

  it('categorizes objects with error or transactionHash properties', () => {
    const errorObj = {
      error: 'Transaction failed on-chain',
      transactionHash: '0x99999',
      errorCode: 'RPC_ERROR',
    };

    const res = categorizeError(errorObj);
    expect(res.message).toBe('Transaction failed on-chain');
    expect(res.txHash).toBe('0x99999');
    expect(res.errorType).toBe('rpc');
  });

  it('categorizes objects with errorCode ERR_NETWORK', () => {
    const errorObj = {
      message: 'Failed request',
      errorCode: 'ERR_NETWORK',
    };

    const res = categorizeError(errorObj);
    expect(res.errorType).toBe('network');
    expect(res.errorCode).toBe('ERR_NETWORK');
  });

  it('categorizes objects with hash and 422 validation code', () => {
    const errorObj = {
      message: 'Unprocessable Entity',
      hash: '0xabc',
      errorCode: 422,
    };

    const res = categorizeError(errorObj);
    expect(res.txHash).toBe('0xabc');
    expect(res.errorType).toBe('validation');
  });
});

describe('useErrorRecovery hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default clean state', () => {
    const { result } = renderHook(() => useErrorRecovery());

    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.cooldown).toBe(0);
    expect(result.current.canRetry).toBe(true);
  });

  it('initializes with provided initial error', () => {
    const { result } = renderHook(() =>
      useErrorRecovery({ initialError: 'Network failure' })
    );

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.errorType).toBe('network');
    expect(result.current.error?.message).toBe('Network failure');
  });

  it('updates error state on setError and clears on clearError', () => {
    const { result } = renderHook(() => useErrorRecovery());

    act(() => {
      result.current.setError('Wallet rejected transaction');
    });

    expect(result.current.error?.errorType).toBe('wallet');
    expect(result.current.rawError).toBe('Wallet rejected transaction');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.rawError).toBeNull();
  });

  it('clears error with null when passed to setError', () => {
    const { result } = renderHook(() =>
      useErrorRecovery({ initialError: 'Network failure' })
    );
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.setError(null);
    });
    expect(result.current.error).toBeNull();
  });

  it('returns false from triggerRetry if no retry function is provided', async () => {
    const { result } = renderHook(() => useErrorRecovery());

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.triggerRetry();
    });

    expect(res).toBe(false);
  });

  it('executes triggerRetry successfully with onRetry option and clears error', async () => {
    const onRetry = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() =>
      useErrorRecovery({ initialError: 'Temporary error', onRetry })
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.triggerRetry();
    });

    expect(success).toBe(true);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(1);
  });

  it('handles failed triggerRetry with cooldown', async () => {
    const retryFn = vi.fn().mockRejectedValue(new Error('Retry failed again'));
    const { result } = renderHook(() =>
      useErrorRecovery({ initialError: 'Initial error', cooldownSeconds: 5 })
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.triggerRetry(retryFn);
    });

    expect(success).toBe(false);
    expect(result.current.error?.message).toBe('Retry failed again');
    expect(result.current.retryCount).toBe(1);
    expect(result.current.cooldown).toBe(5);
    expect(result.current.canRetry).toBe(false);

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.cooldown).toBe(3);

    // Advance remaining 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.cooldown).toBe(0);
    expect(result.current.canRetry).toBe(true);

    // Clear error when cooldown is active
    await act(async () => {
      await result.current.triggerRetry(retryFn);
    });
    expect(result.current.cooldown).toBe(5);
    act(() => {
      result.current.clearError();
    });
    expect(result.current.cooldown).toBe(0);
  });

  it('disables retry when maxRetries is reached', async () => {
    const retryFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
    const { result } = renderHook(() =>
      useErrorRecovery({ maxRetries: 2 })
    );

    await act(async () => {
      await result.current.triggerRetry(retryFn);
    });
    expect(result.current.retryCount).toBe(1);
    expect(result.current.canRetry).toBe(true);

    await act(async () => {
      await result.current.triggerRetry(retryFn);
    });
    expect(result.current.retryCount).toBe(2);
    expect(result.current.canRetry).toBe(false);

    // Subsequent trigger should immediately return false without calling fn
    let thirdAttempt: boolean | undefined;
    await act(async () => {
      thirdAttempt = await result.current.triggerRetry(retryFn);
    });
    expect(thirdAttempt).toBe(false);
    expect(retryFn).toHaveBeenCalledTimes(2);
  });
});
