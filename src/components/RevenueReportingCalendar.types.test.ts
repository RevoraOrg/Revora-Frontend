import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OVERDUE_SEVERITY_COLORS,
  OVERDUE_SEVERITY_LABELS,
  REPORT_STATUS_COLORS,
  REPORT_STATUS_LABELS,
  getOverdueDays,
  getOverdueSeverity,
  type OverdueSeverity,
  type ReportStatus,
} from './RevenueReportingCalendar.types';

/** The status union as declared, used to prove the maps stay exhaustive. */
const REPORT_STATUSES: ReportStatus[] = ['due', 'submitted', 'accepted', 'overdue', 'none'];
const OVERDUE_SEVERITIES: OverdueSeverity[] = ['mild', 'moderate', 'critical'];

describe('RevenueReportingCalendar.types', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ReportStatus', () => {
    it('keeps REPORT_STATUS_LABELS exhaustive and free of stray keys', () => {
      expect(Object.keys(REPORT_STATUS_LABELS).sort()).toEqual([...REPORT_STATUSES].sort());
    });

    it('keeps REPORT_STATUS_COLORS keyed identically to the labels', () => {
      expect(Object.keys(REPORT_STATUS_COLORS).sort()).toEqual(Object.keys(REPORT_STATUS_LABELS).sort());
    });

    it('gives every status a non-empty human label', () => {
      for (const status of REPORT_STATUSES) {
        expect(REPORT_STATUS_LABELS[status]).toBeTruthy();
      }
    });

    it('maps every colour entry to a CSS custom property, except the transparent none state', () => {
      for (const status of REPORT_STATUSES) {
        const colour = REPORT_STATUS_COLORS[status];
        if (status === 'none') {
          expect(colour).toBe('transparent');
        } else {
          expect(colour).toMatch(/^var\(--rc-status-[a-z]+\)$/);
        }
      }
    });

    it('has no runtime validation: unknown statuses resolve to undefined', () => {
      expect((REPORT_STATUS_LABELS as Record<string, string>)['bogus']).toBeUndefined();
      expect((REPORT_STATUS_COLORS as Record<string, string>)['bogus']).toBeUndefined();
    });
  });

  describe('OverdueSeverity', () => {
    it('keeps both severity maps exhaustive', () => {
      expect(Object.keys(OVERDUE_SEVERITY_LABELS).sort()).toEqual([...OVERDUE_SEVERITIES].sort());
      expect(Object.keys(OVERDUE_SEVERITY_COLORS).sort()).toEqual([...OVERDUE_SEVERITIES].sort());
    });

    it('maps severities to CSS custom properties', () => {
      for (const severity of OVERDUE_SEVERITIES) {
        expect(OVERDUE_SEVERITY_COLORS[severity]).toMatch(/^var\(--rc-overdue-[a-z]+\)$/);
      }
    });
  });

  describe('getOverdueSeverity()', () => {
    it('treats the first three overdue days as mild', () => {
      expect(getOverdueSeverity(0)).toBe('mild');
      expect(getOverdueSeverity(1)).toBe('mild');
      expect(getOverdueSeverity(3)).toBe('mild');
    });

    it('flips to moderate on day four and holds through day twenty-nine', () => {
      expect(getOverdueSeverity(4)).toBe('moderate');
      expect(getOverdueSeverity(29)).toBe('moderate');
    });

    it('escalates to critical at exactly thirty days', () => {
      expect(getOverdueSeverity(30)).toBe('critical');
      expect(getOverdueSeverity(3_650)).toBe('critical');
    });

    it('classifies negative day counts (due date still in the future) as mild', () => {
      expect(getOverdueSeverity(-1)).toBe('mild');
      expect(getOverdueSeverity(-400)).toBe('mild');
    });

    it('falls through to moderate for NaN, since both comparisons are false', () => {
      // getOverdueDays() returns NaN for an unparseable date; this pins the
      // resulting classification so it cannot silently become "critical".
      expect(getOverdueSeverity(Number.NaN)).toBe('moderate');
    });

    it('classifies the largest representable day count as critical', () => {
      expect(getOverdueSeverity(Number.MAX_SAFE_INTEGER)).toBe('critical');
    });
  });

  describe('getOverdueDays()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Fixed instant so the "now" side of the subtraction is deterministic.
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    });

    it('returns 0 for a report due earlier the same day', () => {
      expect(getOverdueDays('2024-06-15')).toBe(0);
    });

    it('counts whole elapsed days', () => {
      expect(getOverdueDays('2024-06-14')).toBe(1);
      expect(getOverdueDays('2024-06-01')).toBe(14);
      expect(getOverdueDays('2024-05-16')).toBe(30);
    });

    it('returns a negative count for a due date that has not arrived yet', () => {
      expect(getOverdueDays('2024-06-16')).toBe(-1);
    });

    it('truncates towards negative infinity, not towards zero', () => {
      // 23 hours overdue is not yet one full day (reported as 0), while a report
      // due 47 hours ago reports 1 rather than rounding up to 2.
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      expect(getOverdueDays('2024-06-14T13:00:00.000Z')).toBe(0);
      expect(getOverdueDays('2024-06-13T13:00:00.000Z')).toBe(1);
    });

    it('is purely elapsed-time based and ignores the time of day', () => {
      // A due date one hour in the future still reports one negative day.
      expect(getOverdueDays('2024-06-15T13:00:00.000Z')).toBe(-1);
    });

    it('returns NaN for an unparseable due date instead of throwing', () => {
      expect(getOverdueDays('not-a-date')).toBeNaN();
      expect(getOverdueDays('')).toBeNaN();
    });
  });
});
