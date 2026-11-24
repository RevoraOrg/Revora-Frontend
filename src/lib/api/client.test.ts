import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl, request } from './client';
import {
  ApiError,
  isApiError,
  isRetryableStatus,
  mapStatusToErrorCode,
  normalizeError,
} from './errors';
import { configureMockAdapter, registerMockRoute, resetMockAdapter } from './mockAdapter';

describe('API errors utilities', () => {
  it('maps HTTP status codes to ApiErrorCode', () => {
    expect(mapStatusToErrorCode(400)).toBe('BAD_REQUEST');
    expect(mapStatusToErrorCode(401)).toBe('UNAUTHORIZED');
    expect(mapStatusToErrorCode(403)).toBe('FORBIDDEN');
    expect(mapStatusToErrorCode(404)).toBe('NOT_FOUND');
    expect(mapStatusToErrorCode(408)).toBe('TIMEOUT');
    expect(mapStatusToErrorCode(409)).toBe('CONFLICT');
    expect(mapStatusToErrorCode(422)).toBe('VALIDATION_ERROR');
    expect(mapStatusToErrorCode(429)).toBe('RATE_LIMITED');
    expect(mapStatusToErrorCode(500)).toBe('SERVER_ERROR');
    expect(mapStatusToErrorCode(503)).toBe('SERVER_ERROR');
    expect(mapStatusToErrorCode(418)).toBe('UNKNOWN_ERROR');
  });

  it('determines retryable HTTP statuses', () => {
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });

  it('normalizes ApiError, AbortError, Error, and unknown values', () => {
    const apiErr = new ApiError({
      code: 'BAD_REQUEST',
      message: 'Bad input',
      status: 400,
    });
    expect(normalizeError(apiErr)).toBe(apiErr);
    expect(isApiError(apiErr)).toBe(true);

    const abortErr = new DOMException('Aborted', 'AbortError');
    const normalizedAbort = normalizeError(abortErr);
    expect(normalizedAbort.code).toBe('ABORTED');
    expect(normalizedAbort.retryable).toBe(true);

    const stdErr = new Error('Boom');
    const normalizedStd = normalizeError(stdErr);
    expect(normalizedStd.code).toBe('UNKNOWN_ERROR');
    expect(normalizedStd.message).toBe('Boom');
    expect(normalizedStd.retryable).toBe(false);

    const normalizedUnknown = normalizeError('weird');
    expect(normalizedUnknown.code).toBe('UNKNOWN_ERROR');
    expect(normalizedUnknown.details).toBe('weird');
  });
});

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns null when VITE_API_BASE_URL is unset or empty', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBaseUrl()).toBeNull();
  });

  it('returns trimmed URL without trailing slash when valid', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.revora.finance///');
    expect(getApiBaseUrl()).toBe('https://api.revora.finance');
  });

  it('logs an error and falls back to null when URL is invalid', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('VITE_API_BASE_URL', 'ftp://invalid.example');
    expect(getApiBaseUrl()).toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    vi.stubEnv('VITE_API_BASE_URL', 'not-a-url');
    expect(getApiBaseUrl()).toBeNull();
  });
});

describe('request()', () => {
  const BASE = 'https://api.revora.test';

  beforeEach(() => {
    resetMockAdapter();
    configureMockAdapter({ latencyMs: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('delegates to mockAdapter when no base URL is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    registerMockRoute('GET', '/ping', () => ({ pong: true }));

    const result = await request<{ pong: boolean }>('/ping');
    expect(result).toEqual({ pong: true });
  });

  it('performs JSON GET and POST requests against configured baseUrl', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await request<{ ok: boolean }>('items', {
      method: 'POST',
      body: { name: 'Revora' },
      baseUrl: BASE,
    });

    expect(res).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE}/items`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Revora' }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('handles 204 No Content responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 204 })
    );

    const res = await request<void>('/empty', { baseUrl: BASE });
    expect(res).toBeUndefined();
  });

  it('maps HTTP 422 validation errors with fieldErrors to ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Validation failed',
          fieldErrors: { grossRevenue: 'Must be positive', ignored: 123 },
          details: { traceId: 'abc' },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(request('/reports', { baseUrl: BASE })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'VALIDATION_ERROR',
      status: 422,
      retryable: false,
      message: 'Validation failed',
      fieldErrors: { grossRevenue: 'Must be positive' },
      details: { traceId: 'abc' },
    });
  });

  it('maps HTTP 503 errors with non-JSON body to retryable SERVER_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 })
    );

    await expect(request('/health', { baseUrl: BASE })).rejects.toMatchObject({
      code: 'SERVER_ERROR',
      status: 503,
      retryable: true,
    });
  });

  it('maps invalid JSON on 200 response to PARSE_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('not-json', { status: 200 })
    );

    await expect(request('/broken', { baseUrl: BASE })).rejects.toMatchObject({
      code: 'PARSE_ERROR',
      status: 200,
      retryable: false,
    });
  });

  it('maps network failures to retryable NETWORK_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );

    await expect(request('/offline', { baseUrl: BASE })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: null,
      retryable: true,
    });
  });

  it('produces retryable ApiError(TIMEOUT) when request times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    await expect(
      request('/slow', { baseUrl: BASE, timeoutMs: 25 })
    ).rejects.toMatchObject({
      code: 'TIMEOUT',
      status: null,
      retryable: true,
    });
  });

  it('produces retryable ApiError(ABORTED) when external AbortSignal aborts', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const promise = request('/cancellable', {
      baseUrl: BASE,
      signal: controller.signal,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: 'ABORTED',
      status: null,
      retryable: true,
    });
  });

  it('rejects immediately with retryable ApiError(ABORTED) when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      request('/already-aborted', { baseUrl: BASE, signal: controller.signal })
    ).rejects.toMatchObject({
      code: 'ABORTED',
      status: null,
      retryable: true,
    });
  });
});
