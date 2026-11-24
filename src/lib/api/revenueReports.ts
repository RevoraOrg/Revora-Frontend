import { request, RequestOptions } from './client';
import { registerMockRoute } from './mockAdapter';

export interface SubmitRevenueReportPayload {
  reportPeriod: string;
  grossRevenueCents: number;
  currency: string;
  locale: string;
  notes: string;
  attachmentCount: number;
}

export interface SubmitRevenueReportResponse {
  id: string;
  status: 'received';
  receivedAt: string;
}

type EndpointOptions = Pick<RequestOptions, 'signal' | 'timeoutMs' | 'baseUrl'>;

export function submitRevenueReport(
  payload: SubmitRevenueReportPayload,
  options?: EndpointOptions
): Promise<SubmitRevenueReportResponse> {
  return request<SubmitRevenueReportResponse>('/revenue-reports', {
    method: 'POST',
    body: payload,
    ...options,
  });
}

registerMockRoute('POST', '/revenue-reports', ({ body }) => {
  const payload = body as Partial<SubmitRevenueReportPayload> | undefined;
  const period = payload?.reportPeriod ?? 'unknown';
  return {
    id: `rev-${period}-mock`,
    status: 'received',
    receivedAt: new Date().toISOString(),
  } satisfies SubmitRevenueReportResponse;
});
