import type {
  DayCellData,
  ReportStatus,
  RevenueReport,
} from '../components/RevenueReportingCalendar.types';

export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseISODate(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function isToday(iso: string): boolean {
  const today = new Date();
  const d = parseISODate(iso);
  return (
    d.year === today.getFullYear() &&
    d.month === today.getMonth() &&
    d.day === today.getDate()
  );
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(
  year: number,
  month: number,
  weekStartsOn: number,
): number {
  const day = new Date(year, month, 1).getDay();
  return (day - weekStartsOn + 7) % 7;
}

export function getPrimaryStatus(reports: RevenueReport[]): ReportStatus {
  if (reports.length === 0) return 'none';
  // Priority: overdue > due > submitted > accepted
  if (reports.some((r) => r.status === 'overdue')) return 'overdue';
  if (reports.some((r) => r.status === 'due')) return 'due';
  if (reports.some((r) => r.status === 'submitted')) return 'submitted';
  return 'accepted';
}

export function isOverdue(report: RevenueReport): boolean {
  if (report.status === 'accepted' || report.status === 'submitted')
    return false;
  const due = new Date(report.dueDate);
  const now = new Date();
  return due < now;
}

export function getMonthReports(
  reports: RevenueReport[],
  year: number,
  month: number,
): RevenueReport[] {
  return reports.filter((r) => {
    const d = parseISODate(r.date);
    return d.year === year && d.month === month;
  });
}

export function buildDayCells(
  year: number,
  month: number,
  reports: RevenueReport[],
  selectedDates: string[],
  weekStartsOn: number,
): DayCellData[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month, weekStartsOn);
  const cells: DayCellData[] = [];

  const sortedDates = [...selectedDates].sort();
  const getSelectionProps = (date: string) => {
    const isSelected = selectedDates.includes(date);
    if (!isSelected || sortedDates.length < 2) return { isSelected };
    const isRangeStart = date === sortedDates[0];
    const isRangeEnd = date === sortedDates[sortedDates.length - 1];
    const isInRange = isSelected && !isRangeStart && !isRangeEnd;
    return { isSelected, isRangeStart, isRangeEnd, isInRange };
  };

  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = toISODate(prevYear, prevMonth, day);
    const dayReports = reports.filter((r) => r.date === date);
    cells.push({
      date,
      day,
      inMonth: false,
      isToday: isToday(date),
      ...getSelectionProps(date),
      reports: dayReports,
      primaryStatus: getPrimaryStatus(dayReports),
    });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toISODate(year, month, day);
    const dayReports = reports.filter((r) => r.date === date);
    cells.push({
      date,
      day,
      inMonth: true,
      isToday: isToday(date),
      ...getSelectionProps(date),
      reports: dayReports,
      primaryStatus: getPrimaryStatus(dayReports),
    });
  }

  // Next month padding (fill to complete 6 rows × 7 = 42 cells, or just fill the last row)
  const remaining = 42 - cells.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let day = 1; day <= remaining; day++) {
    const date = toISODate(nextYear, nextMonth, day);
    const dayReports = reports.filter((r) => r.date === date);
    cells.push({
      date,
      day,
      inMonth: false,
      isToday: isToday(date),
      ...getSelectionProps(date),
      reports: dayReports,
      primaryStatus: getPrimaryStatus(dayReports),
    });
  }

  return cells;
}

/** Compute variance of current report vs prior-period report */
export function getVariance(
  current: RevenueReport[],
  prior: RevenueReport[],
): { pct: number | null; direction: 'up' | 'down' | 'flat' } {
  const curRev = current.reduce((s, r) => s + (r.grossRevenue ?? 0), 0);
  const priorRev = prior.reduce((s, r) => s + (r.grossRevenue ?? 0), 0);
  if (priorRev === 0 && curRev === 0) return { pct: null, direction: 'flat' };
  if (priorRev === 0) return { pct: null, direction: 'up' };
  const pct = ((curRev - priorRev) / priorRev) * 100;
  return {
    pct,
    direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat',
  };
}
