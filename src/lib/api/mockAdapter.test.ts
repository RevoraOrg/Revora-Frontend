import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import {
  configureMockAdapter,
  getMockAdapterConfig,
  mockFetchAdapter,
  resetMockAdapter,
} from './mockAdapter';
import {
  DEMO_RECOVERY_CODE,
  requestRecoveryCode,
  resendRecoveryCode,
  verifyRecoveryCode,
} from './twoFactorRecovery';
import { submitRevenueReport } from './revenueReports';

describe('mockAdapter', () => {
  beforeEach(() => {
    resetMockAdapter();
    configureMockAdapter({ latencyMs: 0 });
  });

  afterEach(() => {
    resetMockAdapter();
    vi.restoreAllMocks();
  });

  it('configures and resets mock adapter settings', () => {
    configureMockAdapter({ latencyMs: 50, failureRate: 0.5 });
    expect(getMockAdapterConfig().latencyMs).toBe(50);
    expect(getMockAdapterConfig().failureRate).toBe(0.5);

    resetMockAdapter();
    expect(getMockAdapterConfig().latencyMs).toBe(150);
    expect(getMockAdapterConfig().failureRate).toBe(0);
  });

  it('supports one-shot failNext injection', async () => {
    configureMockAdapter({
      failNext: new ApiError({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        status: 429,
        retryable: true,
      }),
    });

    await expect(requestRecoveryCode('a@b.com')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryable: true,
    });

    // Subsequent call succeeds
    const res = await requestRecoveryCode('a@b.com');
    expect(res.sent).toBe(true);
  });

  it('supports forcedError injection', async () => {
    configureMockAdapter({
      forcedError: new ApiError({
        code: 'SERVER_ERROR',
        message: 'Down for maintenance',
        status: 503,
        retryable: true,
      }),
    });

    await expect(resendRecoveryCode('a@b.com')).rejects.toMatchObject({
      code: 'SERVER_ERROR',
      status: 503,
      retryable: true,
    });
  });

  it('supports probabilistic failureRate injection', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    configureMockAdapter({ failureRate: 0.5 });

    await expect(requestRecoveryCode('a@b.com')).rejects.toMatchObject({
      code: 'SERVER_ERROR',
      status: 503,
      retryable: true,
    });
  });

  it('supports routeOverrides and returns NOT_FOUND for unknown routes', async () => {
    configureMockAdapter({
      routeOverrides: {
        'GET /custom': () => ({ custom: 42 }),
      },
    });

    const res = await mockFetchAdapter<{ custom: number }>({
      method: 'GET',
      path: '/custom',
    });
    expect(res).toEqual({ custom: 42 });

    await expect(
      mockFetchAdapter({ method: 'GET', path: '/does-not-exist' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      retryable: false,
    });
  });

  it('produces retryable TIMEOUT when latency exceeds timeoutMs', async () => {
    configureMockAdapter({ latencyMs: 200 });

    await expect(
      requestRecoveryCode('a@b.com', { timeoutMs: 20 })
    ).rejects.toMatchObject({
      code: 'TIMEOUT',
      status: null,
      retryable: true,
    });
  });

  it('produces retryable ABORTED when AbortSignal fires during latency', async () => {
    configureMockAdapter({ latencyMs: 200 });
    const controller = new AbortController();

    const promise = requestRecoveryCode('a@b.com', {
      signal: controller.signal,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: 'ABORTED',
      status: null,
      retryable: true,
    });
  });

  it('rejects immediately with ABORTED when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      requestRecoveryCode('a@b.com', { signal: controller.signal })
    ).rejects.toMatchObject({
      code: 'ABORTED',
      status: null,
      retryable: true,
    });
  });
});

describe('Endpoint modules', () => {
  beforeEach(() => {
    resetMockAdapter();
    configureMockAdapter({ latencyMs: 0 });
  });

  afterEach(() => {
    resetMockAdapter();
  });

  it('verifies demo recovery code and rejects invalid codes', async () => {
    expect(await verifyRecoveryCode(DEMO_RECOVERY_CODE)).toEqual({
      verified: true,
    });
    expect(await verifyRecoveryCode('000000')).toEqual({ verified: false });
  });

  it('submits revenue report and returns receipt', async () => {
    const receipt = await submitRevenueReport({
      reportPeriod: '2026-05',
      grossRevenueCents: 12500000,
      currency: 'USD',
      locale: 'en-US',
      notes: 'May revenue',
      attachmentCount: 1,
    });

    expect(receipt.status).toBe('received');
    expect(receipt.id).toContain('2026-05');
    expect(receipt.receivedAt).toBeTruthy();
  });
});
