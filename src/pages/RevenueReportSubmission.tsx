import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RevenueReportForm } from '../components/RevenueReportForm';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../constants/i18n';
import { isReportDate, useRevenueReports } from '../lib/revenueReportsStore';

export function revenueSubmissionUrl(date: string, reportId?: string) {
  const params = new URLSearchParams({ date });
  if (reportId) params.set('report', reportId);
  return `/startup/report-revenue?${params}`;
}

export function RevenueReportSubmission() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { reports, store } = useRevenueReports();
  const requestedDate = params.get('date');
  const date = requestedDate && isReportDate(requestedDate) ? requestedDate : undefined;
  const report = reports.find((item) => params.get('report')
    ? item.id === params.get('report') && item.date === date
    : item.date === date && ['due', 'overdue'].includes(item.status));
  if (requestedDate && !date) return <p role="alert">Invalid report date. <Link to="/startup/revenue-calendar">Return to calendar</Link></p>;
  const locale = SUPPORTED_LOCALES.includes(report?.locale as SupportedLocale) ? report?.locale as SupportedLocale : 'en-US';
  return <>
    <Link to="/startup/revenue-calendar">Back to revenue calendar</Link>
    <RevenueReportForm key={report?.id ?? date ?? 'new'} initialValues={date ? {
      reportPeriod: date.slice(0, 7), grossRevenue: report?.grossRevenue,
      currency: report?.currency, locale, notes: report?.notes,
    } : undefined} onSave={(values) => {
      store.submit(date ?? `${values.reportPeriod}-01`, values, report?.id);
      navigate(`/startup/revenue-calendar?month=${date?.slice(0, 7) ?? values.reportPeriod}`);
    }} />
  </>;
}
