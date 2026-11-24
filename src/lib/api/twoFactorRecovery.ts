import { request, RequestOptions } from './client';
import { registerMockRoute } from './mockAdapter';

export const DEMO_RECOVERY_CODE = '123456';

export interface RecoveryCodeRequestResponse {
  sent: boolean;
  expiresInSeconds: number;
}

export interface VerifyRecoveryCodeResponse {
  verified: boolean;
}

type EndpointOptions = Pick<RequestOptions, 'signal' | 'timeoutMs' | 'baseUrl'>;

export function requestRecoveryCode(
  email: string,
  options?: EndpointOptions
): Promise<RecoveryCodeRequestResponse> {
  return request<RecoveryCodeRequestResponse>('/auth/2fa/recovery/request', {
    method: 'POST',
    body: { email },
    ...options,
  });
}

export function verifyRecoveryCode(
  code: string,
  options?: EndpointOptions
): Promise<VerifyRecoveryCodeResponse> {
  return request<VerifyRecoveryCodeResponse>('/auth/2fa/recovery/verify', {
    method: 'POST',
    body: { code },
    ...options,
  });
}

export function resendRecoveryCode(
  email: string,
  options?: EndpointOptions
): Promise<RecoveryCodeRequestResponse> {
  return request<RecoveryCodeRequestResponse>('/auth/2fa/recovery/resend', {
    method: 'POST',
    body: { email },
    ...options,
  });
}

registerMockRoute('POST', '/auth/2fa/recovery/request', () => ({
  sent: true,
  expiresInSeconds: 900,
}));

registerMockRoute('POST', '/auth/2fa/recovery/resend', () => ({
  sent: true,
  expiresInSeconds: 900,
}));

registerMockRoute('POST', '/auth/2fa/recovery/verify', ({ body }) => {
  const payload = body as { code?: string } | undefined;
  return {
    verified: payload?.code === DEMO_RECOVERY_CODE,
  };
});
