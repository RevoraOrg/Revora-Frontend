import '../components/AuditTrailFilters/AuditTrailFilters.css';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RevenueReportingCalendar } from '../components/RevenueReportingCalendar';
import { ExportScopeDialog, type ExportParams, type ScopeConfig, type ExportFormat } from '../components/ExportScopeDialog/ExportScopeDialog';
import { ExportHistoryTable } from '../components/ExportHistory/ExportHistoryTable';
import { EMPTY_FILTERS } from '../components/AuditTrailFilters/savedFilters';
import { REPORT_STATUS_LABELS, type ReportStatus } from '../components/RevenueReportingCalendar.types';
import { REPORT_EXPORT_MIME_TYPES, reportExportFileName, toCsv, toXlsxBytes, toPdfBytes, type ReportExportFormat } from '../utils/reportExport';
import { useRevenueReports } from '../lib/revenueReportsStore';
import { revenueSubmissionUrl } from './RevenueReportSubmission';

const FORMATS: ExportFormat[] = ['CSV', 'XLSX', 'PDF'];
const SCOPES: ScopeConfig[] = [
  { value: 'all-events', label: 'Current view', description: 'All reports in the displayed month.', estimateMultiplier: 0 },
  { value: 'current-filter', label: 'Filtered set', description: 'Reports matching the displayed month and status filter.', estimateMultiplier: 0 },
];

export function downloadRevenueExport(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); }
  } finally { URL.revokeObjectURL(url); }
}

export const RevenueReports: React.FC = () => {
  const { reports, exports, store } = useRevenueReports();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedMonth = params.get('month');
  const [viewMonth, setViewMonth] = useState(requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [exportOpen, setExportOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const monthReports = reports.filter((report) => report.date.startsWith(viewMonth));
  const filteredReports = monthReports.filter((report) => !status || report.status === status);
  const calendarReports = reports.filter((report) => !status || report.status === status);
  const filters = useMemo(() => ({ ...EMPTY_FILTERS, action: status }), [status]);

  const exportReports = (params: ExportParams) => {
    setError('');
    try {
      const selected = params.scope === 'current-filter' ? filteredReports : monthReports;
      if (!selected.length) throw new Error('No reports match this export scope.');
      const scope = params.scope === 'current-filter' ? 'filtered' : 'current';
      const format = params.format.toLowerCase() as ReportExportFormat;
      const rows = [
        ['Date', 'Due date', 'Status', 'Gross revenue', 'Currency', 'Locale', 'Notes'],
        ...selected.map((report) => [report.date, report.dueDate, report.status,
          report.grossRevenue === undefined ? '' : String(report.grossRevenue),
          report.currency ?? 'USD', report.locale ?? 'en-US', report.notes ?? '']),
      ];
      const content = format === 'csv' ? toCsv(rows) : format === 'xlsx' ? toXlsxBytes(rows) : toPdfBytes(rows);
      const blob = new Blob([content as BlobPart], { type: REPORT_EXPORT_MIME_TYPES[format] });
      const fileName = reportExportFileName(scope, format, viewMonth);
      downloadRevenueExport(blob, fileName);
      store.addExport({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: params.format,
        scope: `${scope === 'filtered' ? 'Filtered set' : 'Current view'}: ${viewMonth}${scope === 'filtered' && status ? ` (${REPORT_STATUS_LABELS[status]})` : ''}`,
        sizeBytes: blob.size, fileName, blob });
      setMessage(`Downloaded ${fileName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed. Please try again.');
    } finally { setExportOpen(false); }
  };

  return <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
    <h1 className="text-3xl font-bold">Revenue Reports</h1>
    <p className="text-muted">Monthly revenue submissions, historical imports and exports. Demo changes last until the page is refreshed.</p>
    <Link to="/startup/dashboard">Back to startup dashboard</Link>
    <div className="flex flex-wrap gap-4 items-center">
      <label>Status <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | '')}>
        <option value="">All statuses</option>
        {(['due', 'overdue', 'submitted', 'accepted'] as const).map((value) => <option key={value} value={value}>{REPORT_STATUS_LABELS[value]}</option>)}
      </select></label>
      <button type="button" className="btn btn--primary" onClick={() => setExportOpen(true)}>Export reports</button>
    </div>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    <RevenueReportingCalendar onImportReports={(rows) => {
      const imported = store.importRows(rows);
      setMessage(`Imported ${imported.length} reports. Skipped ${rows.length - imported.length} invalid rows.`);
      setStatus('');
      if (imported[0]) { setViewMonth(imported[0].date.slice(0, 7)); setSelectedDate(imported[0].date); }
    }} reports={calendarReports} viewMonth={viewMonth} selectedDate={selectedDate}
      onMonthChange={setViewMonth} onDateSelect={(date) => {
        setSelectedDate(date);
        const pending = reports.find((report) => report.date === date && ['due', 'overdue'].includes(report.status));
        if (pending) navigate(revenueSubmissionUrl(date, pending.id));
      }} onSubmitReport={(date) => navigate(revenueSubmissionUrl(date))} />
    <ExportScopeDialog open={exportOpen} title="Export Revenue Reports" filters={filters} formats={FORMATS} scopeOptions={SCOPES}
      totalEntries={monthReports.length} filteredEntries={filteredReports.length}
      estimateRows={(scope) => scope === 'current-filter' ? filteredReports.length : monthReports.length}
      onExport={exportReports} onClose={() => setExportOpen(false)} />
    <ExportHistoryTable entries={exports} onDelete={store.deleteExport} onDownload={(id) => {
      const entry = exports.find((item) => item.id === id);
      if (entry) {
        try { downloadRevenueExport(entry.blob, entry.fileName); }
        catch { setError('Download failed. Please try again.'); }
      }
    }} />
  </div>;
};
