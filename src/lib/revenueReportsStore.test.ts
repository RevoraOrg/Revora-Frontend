import { describe, it, expect, vi } from 'vitest';
import { createRevenueReportsStore, createSeedReports, isReportDate } from './revenueReportsStore';

describe('revenue reports store', () => {
  it('rejects impossible calendar dates', () => {
    expect(isReportDate('2026-02-30')).toBe(false);
    expect(isReportDate('2026-13-01')).toBe(false);
    expect(isReportDate('2028-02-29')).toBe(true);
  });
  it('seeds the previous month across the January year boundary', () => {
    const reports = createSeedReports(new Date(2027, 0, 15));
    expect(reports.find((report) => report.id === 'rpt-005')?.date).toBe('2026-12-15');
    expect(reports.every((report) => !Number.isNaN(new Date(report.date).getTime()))).toBe(true);
  });

  it('updates the intended due report while preserving other reports on the same date', () => {
    const store = createRevenueReportsStore(createSeedReports(new Date(2026, 5, 15)));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.submit('2026-06-28', { grossRevenue: 1200, currency: 'EUR', locale: 'en-US', notes: 'Monthly' }, 'rpt-006');
    expect(store.getSnapshot().reports).toHaveLength(7);
    expect(store.getSnapshot().reports.find((report) => report.id === 'rpt-006')).toMatchObject({
      status: 'submitted', grossRevenue: 1200, date: '2026-06-28', dueDate: '2026-06-28', notes: 'Monthly',
    });
    expect(store.getSnapshot().reports.find((report) => report.id === 'rpt-007')?.grossRevenue).toBe(50000);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    store.submit('2026-06-20', { grossRevenue: 0 });
    expect(listener).toHaveBeenCalledOnce();
    expect(store.getSnapshot().reports.find((report) => report.id === 'rpt-003')?.status).toBe('submitted');
  });

  it('adds new reports and imports clean CSV rows without replacing existing reports', () => {
    const store = createRevenueReportsStore([]);
    store.submit('2026-06-01', { grossRevenue: 100 });
    const imported = store.importRows([
      { date: '2026-05-18', revenue: '$1,250.50', currency: 'eur', rowNumber: 2 },
      { date: '2026-05-19', revenue: '0', rowNumber: 3 },
      { date: 'bad', revenue: '15', rowNumber: 4, conflictReason: 'invalid_date' },
      { date: '2026-05-20', revenue: '-10', rowNumber: 5 },
      { date: 'bad', revenue: '10', rowNumber: 6 },
      { date: '2026-05-21', revenue: 'NaN', rowNumber: 7 },
      { date: '2026-05-22', revenue: '5', currency: 'bad-code', rowNumber: 8 },
    ]);
    expect(imported).toHaveLength(2);
    expect(imported[0]).toMatchObject({ date: '2026-05-18', grossRevenue: 1250.5, currency: 'EUR', status: 'submitted' });
    expect(store.getSnapshot().reports).toHaveLength(3);
  });

  it('retains actual export bytes and deletes only the selected history entry', () => {
    const store = createRevenueReportsStore([]);
    const blob = new Blob(['revenue']);
    store.addExport({ id: 'a', timestamp: '2026-06-01', type: 'CSV', scope: 'current', fileName: 'report.csv', sizeBytes: blob.size, blob });
    store.addExport({ id: 'b', timestamp: '2026-06-01', type: 'PDF', scope: 'filtered', fileName: 'report.pdf', sizeBytes: blob.size, blob });
    expect(store.getSnapshot().exports[1].blob).toBe(blob);
    store.deleteExport('a');
    expect(store.getSnapshot().exports.map((entry) => entry.id)).toEqual(['b']);
  });
});
