/**
 * Payout Reschedule Conflict Analysis (Issue #443)
 *
 * Enhanced with lockup period, redemption window, and multi-payout conflict detection.
 */

import { PayoutEvent } from './PayoutTimeline';

export type ConflictSeverity = 'hard' | 'soft' | 'info';

export interface Conflict {
  id: string;
  severity: ConflictSeverity;
  message: string;
  suggestion?: string;
}

interface LockupPeriod {
  start: string;
  end: string;
  label: string;
}

interface RedemptionWindow {
  date: string;
  label: string;
}

/**
 * Analyzes conflicts for a payout being rescheduled.
 *
 * Conflict types:
 * - Hard: exact date collision, lockup period overlap, redemption window conflict
 * - Soft: within 7 days of processing payout, near lockup boundary
 * - Info: multiple payouts clustered, redemption window proximity
 */
export function analyzeConflicts(
  payoutId: string,
  newDateIso: string,
  allPayouts: PayoutEvent[],
  lockupPeriods: LockupPeriod[] = [],
  redemptionWindows: RedemptionWindow[] = [],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const otherPayouts = allPayouts.filter((p) => p.id !== payoutId);
  const newDate = new Date(newDateIso).getTime();
  const MS_PER_DAY = 86_400_000;
  const SEVEN_DAYS = 7 * MS_PER_DAY;

  // ── Hard: Exact Date Collision ──
  const exactMatch = otherPayouts.find((p) => p.date === newDateIso);
  if (exactMatch) {
    conflicts.push({
      id: `hard-date-${exactMatch.id}`,
      severity: 'hard',
      message: `Conflict: Another payout ("${exactMatch.label}") is already scheduled for ${newDateIso}.`,
      suggestion: 'Choose a different date or cancel the conflicting payout first.',
    });
  }

  // ── Hard: Lockup Period Overlap ──
  lockupPeriods.forEach((lockup) => {
    const lockupStart = new Date(lockup.start).getTime();
    const lockupEnd = new Date(lockup.end).getTime();
    if (newDate >= lockupStart && newDate <= lockupEnd) {
      conflicts.push({
        id: `hard-lockup-${lockup.label}`,
        severity: 'hard',
        message: `Conflict: Payout date falls within lockup period "${lockup.label}" (${lockup.start} → ${lockup.end}).`,
        suggestion: `Schedule after ${lockup.end} or request lockup override.`,
      });
    }
  });

  // ── Hard: Redemption Window Conflict ──
  redemptionWindows.forEach((rw) => {
    const rwDate = new Date(rw.date).getTime();
    if (newDateIso === rw.date) {
      conflicts.push({
        id: `hard-redemption-${rw.label}`,
        severity: 'hard',
        message: `Conflict: Payout date coincides with redemption window "${rw.label}".`,
        suggestion: 'Shift payout by at least 2 business days from redemption date.',
      });
    }
  });

  // ── Soft: Within 7 days of processing payout ──
  otherPayouts.forEach((p) => {
    if (p.status === 'processing') {
      const pDate = new Date(p.date).getTime();
      if (Math.abs(newDate - pDate) <= SEVEN_DAYS) {
        conflicts.push({
          id: `soft-proximity-${p.id}`,
          severity: 'soft',
          message: `Warning: Payout is scheduled within 7 days of a processing event ("${p.label}").`,
          suggestion: 'Consider spacing payouts by at least 7 days for processing headroom.',
        });
      }
    }
  });

  // ── Soft: Near Lockup Boundary ──
  lockupPeriods.forEach((lockup) => {
    const lockupEnd = new Date(lockup.end).getTime();
    const daysFromLockup = Math.abs(newDate - lockupEnd) / MS_PER_DAY;
    if (daysFromLockup <= 3 && daysFromLockup > 0) {
      conflicts.push({
        id: `soft-lockup-boundary-${lockup.label}`,
        severity: 'soft',
        message: `Warning: Payout is within 3 days of lockup period "${lockup.label}" ending.`,
        suggestion: 'Verify funds are fully released before payout execution.',
      });
    }
  });

  // ── Info: Multiple Payouts Clustered ──
  const sameDay = otherPayouts.filter((p) => p.date === newDateIso);
  if (sameDay.length >= 2) {
    conflicts.push({
      id: 'info-cluster',
      severity: 'info',
      message: `Notice: ${sameDay.length + 1} payouts are scheduled for ${newDateIso}.`,
      suggestion: 'Large clusters may impact gas fees and processing time.',
    });
  }

  // ── Info: Redemption Window Proximity ──
  redemptionWindows.forEach((rw) => {
    const rwDate = new Date(rw.date).getTime();
    const daysDiff = Math.abs(newDate - rwDate) / MS_PER_DAY;
    if (daysDiff <= 5 && daysDiff > 0) {
      conflicts.push({
        id: `info-redemption-near-${rw.label}`,
        severity: 'info',
        message: `Notice: Payout is within 5 days of redemption window "${rw.label}".`,
        suggestion: 'Ensure sufficient liquidity for both redemption and payout.',
      });
    }
  });

  return conflicts;
}

export type { LockupPeriod, RedemptionWindow };
