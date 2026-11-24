import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { RevenueReport } from '../components/RevenueReportingCalendar.types';
import type { PreviewRow } from '../components/RevenueCalendarCsvImport.types';
import type { ExportHistoryEntry } from '../components/ExportHistory/ExportHistoryTable';

export function isReportDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function createSeedReports(today = new Date()): RevenueReport[] {
  const y = today.getFullYear();
  const m = today.getMonth();
  const previous = new Date(y, m - 1, 1);
  const previousMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;

  return [
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
      date: `${previousMonth}-15`,
      dueDate: `${previousMonth}-15`,
      status: 'accepted',
      grossRevenue: 150000,
      currency: 'USD',
      locale: 'en-US',
      acceptedAt: `${previousMonth}-18`,
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
}

export interface SavedRevenueExport extends ExportHistoryEntry {
  fileName: string;
  blob: Blob;
}

export type RevenueReportValues = Pick<RevenueReport, 'grossRevenue' | 'currency' | 'locale' | 'notes'>;

export function createRevenueReportsStore(initialReports = createSeedReports()) {
  let snapshot = { reports: initialReports, exports: [] as SavedRevenueExport[] };
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    submit(date: string, values: RevenueReportValues, reportId?: string) {
      const existing = reportId
        ? snapshot.reports.find((report) => report.id === reportId)
        : snapshot.reports.find((report) => report.date === date && ['due', 'overdue'].includes(report.status));
      const saved: RevenueReport = {
        ...existing, ...values, id: existing?.id ?? crypto.randomUUID(),
        date, dueDate: existing?.dueDate ?? date, status: 'submitted',
        submittedAt: new Date().toISOString(), acceptedAt: undefined,
      };
      publish({ ...snapshot, reports: existing
        ? snapshot.reports.map((report) => report.id === existing.id ? saved : report)
        : [...snapshot.reports, saved] });
    },
    importRows(rows: PreviewRow[]) {
      const imported = rows.filter((row) => !row.conflictReason).flatMap((row) => {
        const parsed = new Date(row.date);
        const grossRevenue = Number.parseFloat(row.revenue.replace(/[^0-9.-]+/g, ''));
        if (Number.isNaN(parsed.getTime()) || !Number.isFinite(grossRevenue) || grossRevenue < 0) return [];
        const currency = row.currency?.trim().toUpperCase() || 'USD';
        // Keep invalid currency codes out of Intl.NumberFormat in the calendar.
        if (!/^[A-Z]{3}$/.test(currency)) return [];
        const date = /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : parsed.toISOString().slice(0, 10);
        if (!isReportDate(date)) return [];
        return [{ id: crypto.randomUUID(), date, dueDate: date, status: 'submitted' as const,
          grossRevenue, currency, locale: 'en-US', submittedAt: new Date().toISOString() }];
      });
      publish({ ...snapshot, reports: [...snapshot.reports, ...imported] });
      return imported;
    },
    addExport(entry: SavedRevenueExport) {
      publish({ ...snapshot, exports: [entry, ...snapshot.exports] });
    },
    deleteExport(id: string) {
      publish({ ...snapshot, exports: snapshot.exports.filter((entry) => entry.id !== id) });
    },
  };
}

const RevenueReportsContext = createContext(createRevenueReportsStore());
export function RevenueReportsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createRevenueReportsStore);
  return <RevenueReportsContext.Provider value={store}>{children}</RevenueReportsContext.Provider>;
}
export function useRevenueReports() {
  const store = useContext(RevenueReportsContext);
  return { ...useSyncExternalStore(store.subscribe, store.getSnapshot), store };
}
