/**
 * Shared preference contract for notifications (Issue #998).
 *
 * Kept free of React so that both the preferences UI and the notification
 * provider (plus their tests) can use the same validation and delivery rules.
 */

export type ChannelKey = 'inApp' | 'email' | 'sms';
export type CategoryKey = 'distribution' | 'report' | 'compliance' | 'governance';

export type NotificationPreferencesValue = {
  matrix: Record<CategoryKey, Record<ChannelKey, boolean>>;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timeZone: string;
  };
  /** Per-category quiet-hours override: when true, the category always delivers notifications */
  quietHoursOverride: Record<CategoryKey, boolean>;
};

export const CATEGORIES: ReadonlyArray<{ key: CategoryKey; label: string; description?: string }> = [
  { key: 'distribution', label: 'Distribution', description: 'Payout and revenue notifications' },
  { key: 'report', label: 'Report', description: 'Scheduled report notifications' },
  { key: 'compliance', label: 'Compliance', description: 'Regulatory and compliance alerts' },
  { key: 'governance', label: 'Governance', description: 'Voting and proposal notifications' },
];

export const CHANNELS: ReadonlyArray<{ key: ChannelKey; label: string }> = [
  { key: 'inApp', label: 'In-App' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

const CATEGORY_KEYS = CATEGORIES.map((category) => category.key);

export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function normalizeTimeString(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

/** In-app is on by default so the bell shows the shipped mock notifications. */
export function createDefaultNotificationPreferences(
  timeZone: string = getLocalTimeZone(),
): NotificationPreferencesValue {
  const matrix = {} as Record<CategoryKey, Record<ChannelKey, boolean>>;
  const quietHoursOverride = {} as Record<CategoryKey, boolean>;

  for (const category of CATEGORY_KEYS) {
    matrix[category] = { inApp: true, email: false, sms: false };
    quietHoursOverride[category] = false;
  }

  return {
    matrix,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
      timeZone,
    },
    quietHoursOverride,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeBooleanMap(
  value: unknown,
  keys: readonly string[],
): Record<string, boolean> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, boolean> = {};
  for (const key of keys) {
    if (typeof value[key] !== 'boolean') return null;
    result[key] = value[key] as boolean;
  }
  return result;
}

/** Returns a validated value, or null when the stored payload is unusable. */
export function sanitizePreferences(value: unknown): NotificationPreferencesValue | null {
  if (!isRecord(value) || !isRecord(value.matrix) || !isRecord(value.quietHours)) return null;

  const matrix: Record<string, Record<string, boolean>> = {};
  for (const category of CATEGORY_KEYS) {
    const row = sanitizeBooleanMap(value.matrix[category], ['inApp', 'email', 'sms']);
    if (!row) return null;
    matrix[category] = row;
  }

  const quiet = value.quietHours;
  if (
    typeof quiet.enabled !== 'boolean' ||
    typeof quiet.startTime !== 'string' ||
    typeof quiet.endTime !== 'string' ||
    typeof quiet.timeZone !== 'string'
  ) {
    return null;
  }

  const override = sanitizeBooleanMap(value.quietHoursOverride, CATEGORY_KEYS);
  if (!override) return null;

  return {
    matrix: matrix as NotificationPreferencesValue['matrix'],
    quietHours: {
      enabled: quiet.enabled,
      startTime: normalizeTimeString(quiet.startTime),
      endTime: normalizeTimeString(quiet.endTime),
      timeZone: quiet.timeZone,
    },
    quietHoursOverride: override as NotificationPreferencesValue['quietHoursOverride'],
  };
}

export function isQuietHoursActive(
  preferences: NotificationPreferencesValue,
  now: Date = new Date(),
): boolean {
  if (!preferences.quietHours?.enabled) return false;

  const [startHour = 0, startMinute = 0] = preferences.quietHours.startTime.split(':').map(Number);
  const [endHour = 0, endMinute = 0] = preferences.quietHours.endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const current = now.getHours() * 60 + now.getMinutes();

  return end <= start ? current >= start || current < end : current >= start && current < end;
}

/** Whether a category is allowed into the in-app feed right now. */
export function isCategoryDeliverable(
  category: CategoryKey,
  preferences: NotificationPreferencesValue,
  now: Date = new Date(),
): boolean {
  if (!preferences.matrix?.[category]?.inApp) return false;
  return !isQuietHoursActive(preferences, now) || !!preferences.quietHoursOverride?.[category];
}

/** Display filtering ignores quiet hours: already-delivered items stay visible. */
export function isNotificationVisible(
  category: CategoryKey,
  preferences: NotificationPreferencesValue,
): boolean {
  return !!preferences.matrix?.[category]?.inApp;
}
