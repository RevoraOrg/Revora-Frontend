import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RevenueReport } from '../components/RevenueReportingCalendar.types';
import {
  toISODate,
  parseISODate,
  isSameDay,
  isToday,
  getDaysInMonth,
  getFirstDayOfMonth,
  getPrimaryStatus,
  isOverdue,
  getMonthReports,
  buildDayCells,
  getVariance,
} from './calendar';

function makeReport(overrides: Partial<RevenueReport> = {}): RevenueReport {
  return {
    id: 'rep-1',
    date: '2024-02-15',
    dueDate: '2024-02-20T00:00:00Z',
    status: 'due',
    grossRevenue: 1000,
    ...overrides,
  };
}

describe('calendar helpers', () => {
  describe('toISODate', () => {
    it('formats single-digit month and day with leading zeros', () => {
      expect(toISODate(2024, 0, 5)).toBe('2024-01-05');
      expect(toISODate(2024, 8, 9)).toBe('2024-09-09');
    });

    it('formats double-digit month and day', () => {
      expect(toISODate(2024, 11, 31)).toBe('2024-12-31');
      expect(toISODate(2024, 1, 29)).toBe('2024-02-29');
    });
  });

  describe('parseISODate', () => {
    it('parses ISO date string into zero-indexed month', () => {
      expect(parseISODate('2024-01-05')).toEqual({
        year: 2024,
        month: 0,
        day: 5,
      });
      expect(parseISODate('2024-12-31')).toEqual({
        year: 2024,
        month: 11,
        day: 31,
      });
    });

    it('round-trips with toISODate', () => {
      const iso = toISODate(2024, 1, 29);
      const parsed = parseISODate(iso);
      expect(toISODate(parsed.year, parsed.month, parsed.day)).toBe(iso);
    });
  });

  describe('isSameDay', () => {
    it('returns true for identical ISO date strings and false otherwise', () => {
      expect(isSameDay('2024-02-29', '2024-02-29')).toBe(true);
      expect(isSameDay('2024-02-28', '2024-02-29')).toBe(false);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 1, 29, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true only for the current local date', () => {
      expect(isToday('2024-02-29')).toBe(true);
      expect(isToday('2024-02-28')).toBe(false);
      expect(isToday('2024-03-01')).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('returns 29 for leap February (divisible by 4 and 400)', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29);
      expect(getDaysInMonth(2000, 1)).toBe(29);
    });

    it('returns 28 for non-leap February (including century non-leap year)', () => {
      expect(getDaysInMonth(2025, 1)).toBe(28);
      expect(getDaysInMonth(1900, 1)).toBe(28);
    });

    it('returns 31 for all 31-day months', () => {
      const months31 = [0, 2, 4, 6, 7, 9, 11];
      for (const month of months31) {
        expect(getDaysInMonth(2024, month)).toBe(31);
      }
    });

    it('returns 30 for all 30-day months', () => {
      const months30 = [3, 5, 8, 10];
      for (const month of months30) {
        expect(getDaysInMonth(2024, month)).toBe(30);
      }
    });
  });

  describe('getFirstDayOfMonth', () => {
    // 2024-02-01 is a Thursday (day 4)
    it('computes offset for Sunday and Monday week starts', () => {
      expect(getFirstDayOfMonth(2024, 1, 0)).toBe(4);
      expect(getFirstDayOfMonth(2024, 1, 1)).toBe(3);
      expect(getFirstDayOfMonth(2024, 1, 6)).toBe(5);
    });

    // 2024-09-01 is a Sunday (day 0)
    it('wraps around cleanly when month starts before weekStartsOn', () => {
      expect(getFirstDayOfMonth(2024, 8, 0)).toBe(0);
      expect(getFirstDayOfMonth(2024, 8, 1)).toBe(6);
      expect(getFirstDayOfMonth(2024, 8, 2)).toBe(5);
    });
  });

  describe('getPrimaryStatus', () => {
    it('returns none for empty list', () => {
      expect(getPrimaryStatus([])).toBe('none');
    });

    it('prioritizes overdue > due > submitted > accepted', () => {
      expect(
        getPrimaryStatus([
          makeReport({ status: 'accepted' }),
          makeReport({ status: 'submitted' }),
          makeReport({ status: 'due' }),
          makeReport({ status: 'overdue' }),
        ]),
      ).toBe('overdue');

      expect(
        getPrimaryStatus([
          makeReport({ status: 'accepted' }),
          makeReport({ status: 'submitted' }),
          makeReport({ status: 'due' }),
        ]),
      ).toBe('due');

      expect(
        getPrimaryStatus([
          makeReport({ status: 'accepted' }),
          makeReport({ status: 'submitted' }),
        ]),
      ).toBe('submitted');

      expect(getPrimaryStatus([makeReport({ status: 'accepted' })])).toBe(
        'accepted',
      );
    });
  });

  describe('isOverdue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns false for accepted or submitted reports even when dueDate is in the past', () => {
      expect(
        isOverdue(
          makeReport({ status: 'accepted', dueDate: '2024-03-01T00:00:00Z' }),
        ),
      ).toBe(false);
      expect(
        isOverdue(
          makeReport({ status: 'submitted', dueDate: '2024-03-01T00:00:00Z' }),
        ),
      ).toBe(false);
    });

    it('returns true when dueDate is before now for unsubmitted reports', () => {
      expect(
        isOverdue(
          makeReport({ status: 'due', dueDate: '2024-03-15T11:59:59Z' }),
        ),
      ).toBe(true);
      expect(
        isOverdue(
          makeReport({ status: 'overdue', dueDate: '2024-03-10T00:00:00Z' }),
        ),
      ).toBe(true);
    });

    it('returns false when dueDate is equal to or after now', () => {
      expect(
        isOverdue(
          makeReport({ status: 'due', dueDate: '2024-03-15T12:00:00Z' }),
        ),
      ).toBe(false);
      expect(
        isOverdue(
          makeReport({ status: 'due', dueDate: '2024-03-15T12:00:01Z' }),
        ),
      ).toBe(false);
    });
  });

  describe('getMonthReports', () => {
    it('returns only reports matching the given year and month', () => {
      const reports = [
        makeReport({ id: '1', date: '2024-01-31' }),
        makeReport({ id: '2', date: '2024-02-01' }),
        makeReport({ id: '3', date: '2024-02-29' }),
        makeReport({ id: '4', date: '2024-03-01' }),
        makeReport({ id: '5', date: '2023-02-15' }),
      ];

      const result = getMonthReports(reports, 2024, 1);
      expect(result.map((r) => r.id)).toEqual(['2', '3']);
    });
  });

  describe('buildDayCells', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 1, 29, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('builds 42 cells for leap February 2024 with Sunday week start', () => {
      const report = makeReport({ id: 'leap', date: '2024-02-29', status: 'due' });
      const cells = buildDayCells(2024, 1, [report], [], 0);

      expect(cells).toHaveLength(42);
      // Feb 1 2024 is Thursday -> 4 padding days from Jan (28, 29, 30, 31)
      expect(cells[0]).toMatchObject({ date: '2024-01-28', day: 28, inMonth: false });
      expect(cells[3]).toMatchObject({ date: '2024-01-31', day: 31, inMonth: false });
      expect(cells[4]).toMatchObject({ date: '2024-02-01', day: 1, inMonth: true });

      const inMonthCells = cells.filter((c) => c.inMonth);
      expect(inMonthCells).toHaveLength(29);

      const leapCell = cells.find((c) => c.date === '2024-02-29');
      expect(leapCell).toMatchObject({
        day: 29,
        inMonth: true,
        isToday: true,
        primaryStatus: 'due',
      });
      expect(leapCell?.reports).toEqual([report]);

      // Trailing padding starts March 1
      expect(cells[33]).toMatchObject({ date: '2024-03-01', day: 1, inMonth: false });
    });

    it('handles year boundaries for January and December padding', () => {
      // Jan 2024 starts on Monday (1) -> 1 prev-year padding cell when weekStartsOn = 0
      const janCells = buildDayCells(2024, 0, [], [], 0);
      expect(janCells).toHaveLength(42);
      expect(janCells[0]).toMatchObject({ date: '2023-12-31', day: 31, inMonth: false });
      expect(janCells.filter((c) => c.inMonth)).toHaveLength(31);

      // Dec 2024 starts on Sunday (0) -> 0 leading padding when weekStartsOn = 0, 11 trailing in Jan 2025
      const decCells = buildDayCells(2024, 11, [], [], 0);
      expect(decCells).toHaveLength(42);
      expect(decCells[0]).toMatchObject({ date: '2024-12-01', day: 1, inMonth: true });
      expect(decCells[31]).toMatchObject({ date: '2025-01-01', day: 1, inMonth: false });
    });

    it('computes single and multi-date range selection properties', () => {
      const single = buildDayCells(2024, 1, [], ['2024-02-10'], 1);
      const selectedSingle = single.find((c) => c.date === '2024-02-10');
      expect(selectedSingle?.isSelected).toBe(true);
      expect(selectedSingle?.isRangeStart).toBeUndefined();

      const multi = buildDayCells(
        2024,
        1,
        [],
        ['2024-02-12', '2024-02-10', '2024-02-11'],
        1,
      );
      expect(multi.find((c) => c.date === '2024-02-10')).toMatchObject({
        isSelected: true,
        isRangeStart: true,
        isRangeEnd: false,
        isInRange: false,
      });
      expect(multi.find((c) => c.date === '2024-02-11')).toMatchObject({
        isSelected: true,
        isRangeStart: false,
        isRangeEnd: false,
        isInRange: true,
      });
      expect(multi.find((c) => c.date === '2024-02-12')).toMatchObject({
        isSelected: true,
        isRangeStart: false,
        isRangeEnd: true,
        isInRange: false,
      });
    });
  });

  describe('getVariance', () => {
    it('returns flat with null pct when both periods are zero', () => {
      expect(getVariance([], [])).toEqual({ pct: null, direction: 'flat' });
      expect(
        getVariance(
          [makeReport({ grossRevenue: undefined })],
          [makeReport({ grossRevenue: 0 })],
        ),
      ).toEqual({ pct: null, direction: 'flat' });
    });

    it('returns up with null pct when prior is zero and current is positive', () => {
      expect(
        getVariance([makeReport({ grossRevenue: 500 })], []),
      ).toEqual({ pct: null, direction: 'up' });
    });

    it('computes up, down, and flat directions based on ±0.5% threshold', () => {
      expect(
        getVariance(
          [makeReport({ grossRevenue: 1100 })],
          [makeReport({ grossRevenue: 1000 })],
        ),
      ).toEqual({ pct: 10, direction: 'up' });

      expect(
        getVariance(
          [makeReport({ grossRevenue: 900 })],
          [makeReport({ grossRevenue: 1000 })],
        ),
      ).toEqual({ pct: -10, direction: 'down' });

      expect(
        getVariance(
          [makeReport({ grossRevenue: 1004 })],
          [makeReport({ grossRevenue: 1000 })],
        ),
      ).toEqual({ pct: 0.4, direction: 'flat' });
    });

    it('sums multiple reports per period', () => {
      const result = getVariance(
        [makeReport({ grossRevenue: 300 }), makeReport({ grossRevenue: 300 })],
        [makeReport({ grossRevenue: 200 }), makeReport({ grossRevenue: 200 })],
      );
      expect(result).toEqual({ pct: 50, direction: 'up' });
    });
  });
});
