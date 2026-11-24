import {
  ApiError,
  ApiErrorCode,
  isApiError,
  isRetryableStatus,
  mapStatusToErrorCode,
} from './errors';
import { HttpMethod, mockFetchAdapter } from './mockAdapter';

export const DEFAULT_TIMEOUT_MS = 10_000;

function isValidApiBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Reads and validates `VITE_API_BASE_URL` following the `getEnvVarWithFallback` pattern.
 * Returns `null` when unset or invalid so callers fall back to the mock adapter.
 */
export function getApiBaseUrl(): string | null {
  const envValue = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (envValue === undefined || envValue.trim() === '') {
    return null;
  }

  const trimmed = envValue.trim();
  if (!isValidApiBaseUrl(trimmed)) {
    console.error(
      `[API Config] Invalid VITE_API_BASE_URL: "${envValue}". Falling back to mock adapter.`
    );
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Optional explicit base URL override (pass `null` to force mock adapter). */
  baseUrl?: string | null;
}

interface ErrorPayload {
  message?: string;
  code?: ApiErrorCode;
  fieldErrors?: Record<string, string>;
  details?: unknown;
}

function parseErrorPayload(raw: unknown): ErrorPayload {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const payload: ErrorPayload = {};
  if (typeof obj.message === 'string') {
    payload.message = obj.message;
  }
  if (typeof obj.code === 'string') {
    payload.code = obj.code as ApiErrorCode;
  }
  if (obj.fieldErrors && typeof obj.fieldErrors === 'object' && !Array.isArray(obj.fieldErrors)) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj.fieldErrors as Record<string, unknown>)) {
      if (typeof v === 'string') {
        fieldErrors[k] = v;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      payload.fieldErrors = fieldErrors;
    }
  }
  if (obj.details !== undefined) {
    payload.details = obj.details;
  }
  return payload;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    baseUrl: baseUrlOverride,
  } = options;

  const baseUrl =
    baseUrlOverride !== undefined ? baseUrlOverride : getApiBaseUrl();

  if (!baseUrl) {
    return mockFetchAdapter<T>({
      method,
      path,
      body,
      headers,
      timeoutMs,
      signal,
    });
  }

  if (signal?.aborted) {
    throw new ApiError({
      code: 'ABORTED',
      message: 'The request was cancelled.',
      status: null,
      retryable: true,
    });
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => {
    controller.abort();
  };
  signal?.addEventListener('abort', onExternalAbort, { once: true });

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  let serializedBody: string | undefined;
  if (body !== undefined) {
    requestHeaders['Content-Type'] =
      requestHeaders['Content-Type'] ?? 'application/json';
    serializedBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: serializedBody,
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) {
      throw new ApiError({
        code: 'TIMEOUT',
        message: 'The request timed out. Please try again.',
        status: null,
        retryable: true,
        cause: err,
      });
    }
    if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new ApiError({
        code: 'ABORTED',
        message: 'The request was cancelled.',
        status: null,
        retryable: true,
        cause: err,
      });
    }
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Please check your connection and try again.',
      status: null,
      retryable: true,
      cause: err,
    });
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!response.ok) {
    let rawError: unknown;
    try {
      rawError = await response.json();
    } catch {
      rawError = undefined;
    }
    const parsed = parseErrorPayload(rawError);
    throw new ApiError({
      code: parsed.code ?? mapStatusToErrorCode(response.status),
      message:
        parsed.message ??
        `Request failed with status ${response.status}.`,
      status: response.status,
      retryable: isRetryableStatus(response.status),
      fieldErrors: parsed.fieldErrors,
      details: parsed.details,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    if (isApiError(err)) throw err;
    throw new ApiError({
      code: 'PARSE_ERROR',
      message: 'Received an invalid response from the server.',
      status: response.status,
      retryable: false,
      cause: err,
    });
  }
}
