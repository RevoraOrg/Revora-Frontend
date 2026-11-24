import { ApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface MockRequestContext {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export type MockRouteHandler = (
  ctx: MockRequestContext
) => unknown | Promise<unknown>;

export interface MockAdapterConfig {
  /** Simulated network latency in milliseconds. Defaults to 150. */
  latencyMs: number;
  /** Probability (0..1) of injecting a synthetic retryable server failure. Defaults to 0. */
  failureRate: number;
  /** When set, every mock request rejects with this ApiError. */
  forcedError: ApiError | null;
  /** When set, the next mock request rejects with this ApiError and then clears it. */
  failNext: ApiError | null;
  /** Optional per-route overrides keyed by `"METHOD /path"`. */
  routeOverrides: Record<string, MockRouteHandler>;
}

const DEFAULT_CONFIG: MockAdapterConfig = {
  latencyMs: 150,
  failureRate: 0,
  forcedError: null,
  failNext: null,
  routeOverrides: {},
};

let currentConfig: MockAdapterConfig = { ...DEFAULT_CONFIG, routeOverrides: {} };

const registeredRoutes = new Map<string, MockRouteHandler>();

function routeKey(method: HttpMethod, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${method.toUpperCase()} ${normalizedPath}`;
}

export function registerMockRoute(
  method: HttpMethod,
  path: string,
  handler: MockRouteHandler
): void {
  registeredRoutes.set(routeKey(method, path), handler);
}

export function configureMockAdapter(
  partial: Partial<MockAdapterConfig>
): void {
  currentConfig = {
    ...currentConfig,
    ...partial,
    routeOverrides: partial.routeOverrides
      ? { ...currentConfig.routeOverrides, ...partial.routeOverrides }
      : currentConfig.routeOverrides,
  };
}

export function resetMockAdapter(): void {
  currentConfig = { ...DEFAULT_CONFIG, routeOverrides: {} };
}

export function getMockAdapterConfig(): Readonly<MockAdapterConfig> {
  return currentConfig;
}

export interface MockAdapterRequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function waitWithSignalAndTimeout(
  delayMs: number,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      new ApiError({
        code: 'ABORTED',
        message: 'The request was cancelled.',
        status: null,
        retryable: true,
      })
    );
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (delayTimer !== undefined) clearTimeout(delayTimer);
      if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new ApiError({
          code: 'ABORTED',
          message: 'The request was cancelled.',
          status: null,
          retryable: true,
        })
      );
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    if (timeoutMs !== undefined && timeoutMs >= 0 && timeoutMs < delayMs) {
      timeoutTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(
          new ApiError({
            code: 'TIMEOUT',
            message: 'The request timed out. Please try again.',
            status: null,
            retryable: true,
          })
        );
      }, timeoutMs);
    }

    delayTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, delayMs);
  });
}

export async function mockFetchAdapter<T>(
  options: MockAdapterRequestOptions
): Promise<T> {
  const { method, path, body, headers, timeoutMs, signal } = options;

  await waitWithSignalAndTimeout(currentConfig.latencyMs, timeoutMs, signal);

  if (currentConfig.failNext) {
    const err = currentConfig.failNext;
    currentConfig = { ...currentConfig, failNext: null };
    throw err;
  }

  if (currentConfig.forcedError) {
    throw currentConfig.forcedError;
  }

  if (
    currentConfig.failureRate > 0 &&
    Math.random() < currentConfig.failureRate
  ) {
    throw new ApiError({
      code: 'SERVER_ERROR',
      message: 'Simulated server failure. Please try again.',
      status: 503,
      retryable: true,
    });
  }

  const key = routeKey(method, path);
  const handler =
    currentConfig.routeOverrides[key] ?? registeredRoutes.get(key);

  if (!handler) {
    throw new ApiError({
      code: 'NOT_FOUND',
      message: `No mock handler registered for ${key}`,
      status: 404,
      retryable: false,
    });
  }

  const result = await handler({ method, path, body, headers });
  return result as T;
}
