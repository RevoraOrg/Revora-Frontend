import React from 'react';
import { RevenueReportingCalendar } from '../components/RevenueReportingCalendar';
import { RevenueReport, ReportStatus } from '../components/RevenueReportingCalendar.types';

/* ─── Mock Data ────────────────────────────────────────────────────── */

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

const mockReports: RevenueReport[] = [
  {
    id: 'rpt-001',
    date: `${y}-${String(m + 1).padStart(2, '0')}-05`,
    dueDate: `${y}-${String(m + 1).padStart(2, '0')}-05`,
    status: 'accepted',
    grossRevenue: 125000,
    currency: 'USD',
    locale: 'en-US',
    acceptedAt: `${y}-${String(m + 1).padStart(2, '0')}-08`,
    notes: 'Q2 revenue report approved.',
  },
  {
    id: 'rpt-002',
    date: `${y}-${String(m + 1).padStart(2, '0')}-12`,
    dueDate: `${y}-${String(m + 1).padStart(2, '0')}-12`,
    status: 'submitted',
    grossRevenue: 98000,
    currency: 'USD',
    locale: 'en-US',
    submittedAt: `${y}-${String(m + 1).padStart(2, '0')}-10`,
  },
  {
    id: 'rpt-003',
    date: `${y}-${String(m + 1).padStart(2, '0')}-20`,
    dueDate: `${y}-${String(m + 1).padStart(2, '0')}-20`,
    status: 'due',
    grossRevenue: undefined,
    currency: 'USD',
    locale: 'en-US',
  },
  {
    id: 'rpt-004',
    date: `${y}-${String(m + 1).padStart(2, '0')}-25`,
    dueDate: `${y}-${String(m + 1).padStart(2, '0')}-25`,
    status: 'overdue',
    grossRevenue: undefined,
    currency: 'USD',
    locale: 'en-US',
  },
  // Previous month reports
  {
    id: 'rpt-005',
    date: `${y}-${String(m).padStart(2, '0')}-15`,
    dueDate: `${y}-${String(m).padStart(2, '0')}-15`,
    status: 'accepted',
    grossRevenue: 150000,
    currency: 'USD',
    locale: 'en-US',
    acceptedAt: `${y}-${String(m).padStart(2, '0')}-18`,
  },
  // Multiple reports on same day
  {
    id: 'rpt-006',
    date: `${y}-${String(m + 1).padStart(2, '0')}-28`,
    dueDate: `${y}-${String(m + 1).padStart(2, '0')}-28`,
    status: 'due',
    grossRevenue: undefined,
    currency: 'USD',
    locale: 'en-US',
  },
  {
    id: 'rpt-007',
    date: `${y}-${String(m + 1).padStart(2, '0')}-28`,
    dueDate: `${y}-${String(m + 1).padStart(2, '0')}-28`,
    status: 'submitted',
    grossRevenue: 50000,
    currency: 'USD',
    locale: 'en-US',
    submittedAt: `${y}-${String(m + 1).padStart(2, '0')}-27`,
  },
];

export const RevenueReports: React.FC = () => {
  const [reports] = React.useState<RevenueReport[]>(mockReports);
  const [selectedDate, setSelectedDate] = React.useState<string | undefined>(undefined);
  const [viewMonth, setViewMonth] = React.useState<string | undefined>(undefined);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleMonthChange = (month: string) => {
    setViewMonth(month);
  };

  const handleSubmitReport = (date: string) => {
    alert(`Submit report for ${date}`);
  };

  const handleReportAction = (reportId: string, action: string) => {
    alert(`Action "${action}" on report ${reportId}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue Reports</h1>
        <p className="text-muted text-sm mt-1">
          Monthly revenue submissions and payout estimates.
        </p>
      </div>

      <RevenueReportingCalendar
        reports={reports}
        selectedDate={selectedDate}
        viewMonth={viewMonth}
        locale="en-US"
        weekStartsOn={0}
        onDateSelect={handleDateSelect}
        onMonthChange={handleMonthChange}
        onSubmitReport={handleSubmitReport}
        onReportAction={handleReportAction}
      />
    </div>
  );
};
