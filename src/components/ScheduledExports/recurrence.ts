import type { RecurrenceRule } from './types';
import { DAY_LABELS } from './types';

export function describeSchedule(rule: RecurrenceRule): string {
  const time = formatTime(rule.time);
  const tz = rule.timezone;
  switch (rule.frequency) {
    case 'daily':
      return `Daily at ${time} (${tz})`;
    case 'weekly': {
      const day = rule.dayOfWeek !== undefined ? DAY_LABELS[rule.dayOfWeek] : 'Monday';
      return `Weekly on ${day} at ${time} (${tz})`;
    }
    case 'monthly': {
      const day = rule.dayOfMonth ?? 1;
      const suffix = ordinalSuffix(day);
      return `Monthly on the ${day}${suffix} at ${time} (${tz})`;
    }
  }
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 (Sun) - 6 (Sat)
  hour: number; // 0-23
  minute: number;
  second: number;
}

/**
 * Extracts local calendar and wall-clock components for `date` in `timezone`
 * using `Intl.DateTimeFormat`.
 */
function getLocalDateParts(date: Date, timezone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? '0';

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

/**
 * Returns the timezone offset (in ms) between `timezone` and UTC at `date`.
 * Positive means the target timezone is ahead of UTC (e.g. UTC+13).
 */
function getTzOffsetMs(date: Date, timezone: string): number {
  const { year, month, day, hour, minute, second } = getLocalDateParts(date, timezone);
  const truncatedUtc = Math.floor(date.getTime() / 1000) * 1000;
  return Date.UTC(year, month - 1, day, hour, minute, second) - truncatedUtc;
}

/**
 * Adds `deltaDays` to a local calendar date `(year, month0, day)` and returns
 * the normalized `[year, month0, day]` tuple.
 */
function addLocalDays(
  year: number,
  month0: number,
  day: number,
  deltaDays: number,
): [number, number, number] {
  const d = new Date(Date.UTC(year, month0, day + deltaDays));
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/**
 * Converts a local-time-in-timezone (expressed as `[year, month0, day, hours, minutes]`)
 * to the equivalent UTC `Date`, resolving the timezone offset at the target local time
 * so DST transitions preserve wall-clock time.
 */
function localToUtc(
  localComponents: [number, number, number, number, number],
  timezone: string,
): Date {
  const [y, m, d, h, min] = localComponents;
  const localTs = Date.UTC(y, m, d, h, min, 0, 0);

  const offset1 = getTzOffsetMs(new Date(localTs), timezone);
  const utc1 = new Date(localTs - offset1);

  const offset2 = getTzOffsetMs(utc1, timezone);
  if (offset2 === offset1) {
    return utc1;
  }

  const utc2 = new Date(localTs - offset2);
  const check = getLocalDateParts(utc2, timezone);
  if (check.hour === h && check.minute === min) {
    return utc2;
  }

  // Spring-forward gap: the requested wall-clock time does not exist on this day.
  return utc1;
}

/**
 * Computes the next run time for a recurring schedule.
 *
 * Algorithm:
 * 1. Resolve the current local date and weekday in `rule.timezone` via `Intl.DateTimeFormat`.
 * 2. For weekly / monthly schedules, snap the local calendar components to the target
 *    weekday or day-of-month (clamped to the month's length).
 * 3. Convert the snapped local date and wall-clock time to UTC using the timezone offset
 *    at that target date.
 * 4. If that instant is not in the future (`candidate <= now`), advance the local calendar
 *    components by the recurrence period (1 day, 7 days, or 1 month with clamping) and
 *    convert to UTC again so DST transitions preserve wall-clock time.
 *
 * @returns ISO-8601 string of the next occurrence.
 */
export function computeNextRun(rule: RecurrenceRule, after?: Date): string {
  const now = after ?? new Date();
  const [hours, minutes] = rule.time.split(':').map(Number);

  // ── Step 1: Get the current local date and weekday in the target timezone ──
  const localNow = getLocalDateParts(now, rule.timezone);
  let targetYear = localNow.year;
  let targetMonth0 = localNow.month - 1;
  let targetDay = localNow.day;

  // ── Step 2: Snap local calendar components to target weekday / day-of-month ─
  if (rule.frequency === 'weekly' && rule.dayOfWeek !== undefined) {
    let diff = rule.dayOfWeek - localNow.weekday;
    const targetDay = rule.dayOfWeek;
    const currentDay = candidate.getUTCDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    if (diff > 0) {
      [targetYear, targetMonth0, targetDay] = addLocalDays(
        targetYear,
        targetMonth0,
        targetDay,
        diff,
      );
    }
  }

  if (rule.frequency === 'monthly' && rule.dayOfMonth !== undefined) {
    targetDay = Math.min(rule.dayOfMonth, daysInMonth(targetYear, targetMonth0));
  }

  // ── Step 3: Convert snapped local date/time to UTC ──────────────────────────
  let candidate = localToUtc(
    [targetYear, targetMonth0, targetDay, hours, minutes],
    rule.timezone,
  );

  // ── Step 4: If candidate is in the past, advance local date and reconvert ───
  if (candidate <= now) {
    switch (rule.frequency) {
      case 'daily': {
        [targetYear, targetMonth0, targetDay] = addLocalDays(
          targetYear,
          targetMonth0,
          targetDay,
          1,
        );
        candidate = localToUtc(
          [targetYear, targetMonth0, targetDay, hours, minutes],
          rule.timezone,
        );
        break;
      }

      case 'weekly': {
        [targetYear, targetMonth0, targetDay] = addLocalDays(
          targetYear,
          targetMonth0,
          targetDay,
          7,
        );
        candidate = localToUtc(
          [targetYear, targetMonth0, targetDay, hours, minutes],
          rule.timezone,
        );
        candidate = new Date(candidate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const targetDay = rule.dayOfWeek!;
        const currentDay = candidate.getUTCDay();
        let diff = targetDay - currentDay;
        if (diff < 0) diff += 7;
        if (diff > 0) {
          candidate = new Date(candidate.getTime() + diff * 24 * 60 * 60 * 1000);
        }
        break;
      }

      case 'monthly': {
        const nextMonth = targetMonth0 + 1;
        const nextYear = nextMonth > 11 ? targetYear + 1 : targetYear;
        const nextMonth0 = nextMonth > 11 ? 0 : nextMonth;
        const tDay = rule.dayOfMonth ?? 1;
        const clampedDay = Math.min(tDay, daysInMonth(nextYear, nextMonth0));
        candidate = localToUtc(
          [nextYear, nextMonth0, clampedDay, hours, minutes],
          rule.timezone,
        );
        break;
      }
    }
  }

  return candidate.toISOString();
}

export function validateRecurrenceRule(rule: RecurrenceRule): string | null {
  if (!rule.time || !/^\d{2}:\d{2}$/.test(rule.time)) {
    return 'Time must be in HH:mm format';
  }
  if (!rule.timezone) {
    return 'Timezone is required';
  }
  if (rule.frequency === 'weekly' && (rule.dayOfWeek === undefined || rule.dayOfWeek < 0 || rule.dayOfWeek > 6)) {
    return 'Day of week is required for weekly schedules';
  }
  if (rule.frequency === 'monthly' && (rule.dayOfMonth === undefined || rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) {
    return 'Day of month must be between 1 and 31';
  }
  return null;
}

export function validateScheduleForm(data: {
  name: string;
  format: string;
  schedule: RecurrenceRule;
}): string | null {
  if (!data.name.trim()) return 'Name is required';
  if (!['csv', 'json', 'pdf'].includes(data.format)) return 'Format is required';
  return validateRecurrenceRule(data.schedule);
}

export function defaultRecurrenceRule(): RecurrenceRule {
  return {
    frequency: 'daily',
    time: '09:00',
    timezone: 'UTC',
    dayOfWeek: 1,
    dayOfMonth: 1,
  };
}
