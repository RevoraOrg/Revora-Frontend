import { describe, expect, it } from 'vitest';
import {
  createDefaultNotificationPreferences,
  isCategoryDeliverable,
  isNotificationVisible,
  isQuietHoursActive,
  normalizeTimeString,
  sanitizePreferences,
  type NotificationPreferencesValue,
} from './notificationPreferences';

describe('notification preferences helpers', () => {
  it('creates defaults with in-app enabled and quiet hours off', () => {
    const value = createDefaultNotificationPreferences('UTC');
    expect(value.quietHours).toEqual({
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
      timeZone: 'UTC',
    });
    expect(Object.values(value.matrix).every((row) => row.inApp)).toBe(true);
    expect(Object.values(value.quietHoursOverride).every((override) => !override)).toBe(true);
  });

  it('normalizes valid times and leaves invalid input unchanged', () => {
    expect(normalizeTimeString('9:30')).toBe('9:30');
    expect(normalizeTimeString('09:30')).toBe('09:30');
    expect(normalizeTimeString('24:00')).toBe('24:00');
  });

  it('validates stored values and rejects malformed shapes', () => {
    const valid = createDefaultNotificationPreferences('UTC');
    expect(sanitizePreferences(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
    expect(sanitizePreferences(null)).toBeNull();
    expect(sanitizePreferences({})).toBeNull();
    expect(sanitizePreferences({
      ...valid,
      matrix: { ...valid.matrix, report: { inApp: 'yes', email: false, sms: false } },
    })).toBeNull();
    expect(sanitizePreferences({ ...valid, quietHoursOverride: undefined })).toBeNull();
  });

  it('detects quiet hours that cross midnight and those that do not', () => {
    const base = createDefaultNotificationPreferences('UTC');
    const overnight: NotificationPreferencesValue = {
      ...base,
      quietHours: { ...base.quietHours, enabled: true, startTime: '22:00', endTime: '07:00' },
    };
    expect(isQuietHoursActive(overnight, new Date(2026, 0, 1, 23, 0))).toBe(true);
    expect(isQuietHoursActive(overnight, new Date(2026, 0, 1, 12, 0))).toBe(false);
    expect(isQuietHoursActive(base, new Date(2026, 0, 1, 23, 0))).toBe(false);

    const sameDay: NotificationPreferencesValue = {
      ...base,
      quietHours: { ...base.quietHours, enabled: true, startTime: '09:00', endTime: '17:00' },
    };
    expect(isQuietHoursActive(sameDay, new Date(2026, 0, 1, 10, 0))).toBe(true);
    expect(isQuietHoursActive(sameDay, new Date(2026, 0, 1, 18, 0))).toBe(false);
  });

  it('applies channel and quiet-hours rules when generating', () => {
    const base = createDefaultNotificationPreferences('UTC');
    expect(isCategoryDeliverable('distribution', base)).toBe(true);
    expect(isNotificationVisible('distribution', base)).toBe(true);

    const noInApp: NotificationPreferencesValue = {
      ...base,
      matrix: { ...base.matrix, distribution: { inApp: false, email: true, sms: false } },
    };
    expect(isCategoryDeliverable('distribution', noInApp)).toBe(false);
    expect(isNotificationVisible('distribution', noInApp)).toBe(false);

    const quiet: NotificationPreferencesValue = {
      ...base,
      quietHours: { ...base.quietHours, enabled: true, startTime: '00:00', endTime: '23:59' },
    };
    expect(isCategoryDeliverable('report', quiet, new Date(2026, 0, 1, 12, 0))).toBe(false);
    expect(isNotificationVisible('report', quiet)).toBe(true);
    expect(isCategoryDeliverable(
      'report',
      { ...quiet, quietHoursOverride: { ...quiet.quietHoursOverride, report: true } },
      new Date(2026, 0, 1, 12, 0),
    )).toBe(true);
  });
});
