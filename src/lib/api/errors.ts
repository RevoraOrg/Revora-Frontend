export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApiErrorOptions {
  code: ApiErrorCode;
  message: string;
  status?: number | null;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;
  readonly details?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
    this.fieldErrors = options.fieldErrors;
    this.details = options.details;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function mapStatusToErrorCode(status: number): ApiErrorCode {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 408) return 'TIMEOUT';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN_ERROR';
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({
      code: 'ABORTED',
      message: 'The request was cancelled.',
      status: null,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof Error) {
    return new ApiError({
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
      status: null,
      retryable: false,
      cause: error,
    });
  }
  return new ApiError({
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    status: null,
    retryable: false,
    details: error,
  });
}
