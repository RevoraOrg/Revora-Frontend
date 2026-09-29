/**
 * types.test.ts — Issue #677
 *
 * Focused behavior coverage for `src/components/AdminAlertsInbox/types.ts`,
 * the shared contract module of the admin alerts inbox.
 *
 * The module exports four type-only contracts:
 *   - AlertSeverity     ('critical' | 'high' | 'medium' | 'low')
 *   - AlertStatus       ('active' | 'acknowledged' | 'assigned' | 'resolved')
 *   - Alert             (alert record shaped by the two unions above)
 *   - GroupingStrategy  ('severity' | 'issuer' | 'time' | 'none')
 *
 * Because these contracts are erased at runtime, coverage is split in two:
 *   - compile-time: exact-union and structural assertions via `expectTypeOf`,
 *     plus representative invalid inputs rejected through `@ts-expect-error`
 *     (enforced by the repository's `tsc` pass — a directive that stops
 *     matching an error fails the typecheck)
 *   - runtime: deterministic boundary guards, fixture validation for
 *     `alertsData.ts`, status-lifecycle transitions, and severity ordering
 *
 * The public contract is only exercised, never modified.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';

import { mockAlerts } from './alertsData';
import type { Alert, AlertSeverity, AlertStatus, GroupingStrategy } from './types';

// ─── Canonical domain values (runtime mirrors of the type unions) ────────────
const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const satisfies readonly AlertSeverity[];
const STATUSES = ['active', 'acknowledged', 'assigned', 'resolved'] as const satisfies readonly AlertStatus[];

const isSeverity = (value: unknown): value is AlertSeverity =>
  (SEVERITIES as readonly unknown[]).includes(value);

const isStatus = (value: unknown): value is AlertStatus =>
  (STATUSES as readonly unknown[]).includes(value);

// ─── Factory: fully-typed Alert used as the base for every compile-time case ─
function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-test-1',
    issuerId: 'iss-1',
    issuerName: 'Stellar Tech',
    severity: 'high',
    status: 'active',
    title: 'Scheduled payment overdue',
    description: 'Revenue share payment is past its scheduled date.',
    createdAt: '2026-09-27T12:00:00.000Z',
    ...overrides,
  };
}

const baseAlert = makeAlert();

// ─── Public contract: exact unions and structural shape ──────────────────────
describe('AdminAlertsInbox types — public contract', () => {
  it('AlertSeverity is exactly the four documented literals', () => {
    expectTypeOf<AlertSeverity>().toEqualTypeOf<'critical' | 'high' | 'medium' | 'low'>();
  });

  it('AlertStatus is exactly the four documented lifecycle literals', () => {
    expectTypeOf<AlertStatus>().toEqualTypeOf<'active' | 'acknowledged' | 'assigned' | 'resolved'>();
  });

  it('GroupingStrategy is exactly the four documented grouping literals', () => {
    expectTypeOf<GroupingStrategy>().toEqualTypeOf<'severity' | 'issuer' | 'time' | 'none'>();
  });

  it('Alert has the documented structural shape with an optional assignee', () => {
    expectTypeOf<Alert>().toEqualTypeOf<{
      id: string;
      issuerId: string;
      issuerName: string;
      severity: AlertSeverity;
      status: AlertStatus;
      title: string;
      description: string;
      createdAt: string; // ISO 8601 string
      assignedTo?: string;
    }>();
  });

  it('field types surface exactly the unions (no widening to string)', () => {
    const alert = makeAlert();
    expectTypeOf(alert.severity).toEqualTypeOf<AlertSeverity>();
    expectTypeOf(alert.status).toEqualTypeOf<AlertStatus>();
    expectTypeOf(alert.createdAt).toEqualTypeOf<string>();
    expectTypeOf(alert.assignedTo).toEqualTypeOf<string | undefined>();
  });

  it('every union member is assignable in type and fixture positions', () => {
    const severities: AlertSeverity[] = [...SEVERITIES];
    const statuses: AlertStatus[] = [...STATUSES];
    expect(severities).toHaveLength(4);
    expect(statuses).toHaveLength(4);
  });

  it('severity narrows to the compared literal inside equality checks', () => {
    // Parameter-based CFA: the union type survives until the comparison narrows it.
    function narrowByEquality(severity: AlertSeverity): void {
      if (severity === 'critical') {
        expectTypeOf(severity).toEqualTypeOf<'critical'>();
      } else {
        expectTypeOf(severity).toEqualTypeOf<Exclude<AlertSeverity, 'critical'>>();
      }
    }
    narrowByEquality('critical');
    narrowByEquality('low');
  });

  it('status narrows per branch in an exhaustive switch over the union', () => {
    // Mirrors AlertRow's exhaustive status → label mapping: every branch sees
    // exactly its own literal, and the function covers the whole union.
    const labelFor = (status: AlertStatus): string => {
      switch (status) {
        case 'active':
          expectTypeOf(status).toEqualTypeOf<'active'>();
          return 'Active';
        case 'acknowledged':
          expectTypeOf(status).toEqualTypeOf<'acknowledged'>();
          return 'Acknowledged';
        case 'assigned':
          expectTypeOf(status).toEqualTypeOf<'assigned'>();
          return 'Assigned';
        case 'resolved':
          expectTypeOf(status).toEqualTypeOf<'resolved'>();
          return 'Resolved';
      }
    };
    expect(labelFor('assigned')).toBe('Assigned');
    expect(labelFor('resolved')).toBe('Resolved');
  });
});

// ─── Invalid inputs (compile-time rejections, enforced by tsc --noEmit) ──────
describe('AdminAlertsInbox types — invalid inputs', () => {
  it('rejects unknown severity literals, including case variants', () => {
    // @ts-expect-error — 'severe' is not an AlertSeverity member
    const unknown: AlertSeverity = 'severe';
    // @ts-expect-error — members are case-sensitive literals
    const wrongCase: AlertSeverity = 'Critical';
    expect(unknown).toBe('severe'); // deterministic pass-through at runtime
    expect(wrongCase).toBe('Critical');
  });

  it('rejects unknown status literals', () => {
    // @ts-expect-error — 'pending' is not an AlertStatus member
    const unknown: AlertStatus = 'pending';
    expect(unknown).toBe('pending');
  });

  it('rejects unknown grouping literals', () => {
    // @ts-expect-error — 'grouped' is not a GroupingStrategy member
    const unknown: GroupingStrategy = 'grouped';
    expect(unknown).toBe('grouped');
  });

  it('rejects an Alert literal with a wrong-typed severity', () => {
    // @ts-expect-error — 'urgent' is not assignable to Alert.severity
    const wrong: Alert = { ...baseAlert, severity: 'urgent' };
    expect(wrong.severity).toBe('urgent');
  });

  it('rejects an Alert literal with a wrong-typed assignee', () => {
    // @ts-expect-error — assignedTo must be a string
    const wrong: Alert = { ...baseAlert, assignedTo: 42 };
    expect(wrong.assignedTo).toBe(42);
  });

  it('rejects an Alert literal missing a required field', () => {
    // @ts-expect-error — description is required on Alert
    const incomplete: Alert = { id: 'a-1', issuerId: 'iss-1', issuerName: 'Stellar Tech', severity: 'high', status: 'active', title: 't', createdAt: '2026-09-27T12:00:00.000Z' };
    expect(incomplete.description).toBeUndefined();
  });

  it('rejects unknown properties on fresh Alert literals', () => {
    // @ts-expect-error — 'priority' is not part of the Alert contract
    const extra: Alert = { ...baseAlert, priority: 'urgent' };
    expect(extra).toHaveProperty('priority', 'urgent');
  });

  it('rejects an incomplete status→label map (Record must exhaust the union)', () => {
    // @ts-expect-error — Record<AlertStatus, string> requires the 'resolved' key
    const incomplete: Record<AlertStatus, string> = { active: 'Active', acknowledged: 'Acknowledged', assigned: 'Assigned' };
    expect(Object.keys(incomplete)).toHaveLength(3);
  });
});

// ─── Primary state transitions ───────────────────────────────────────────────
describe('AdminAlertsInbox types — primary state transitions', () => {
  it('an alert walks the full status lifecycle without leaving the union', () => {
    const alert = makeAlert();
    expect(alert.status).toBe('active');

    alert.status = 'acknowledged';
    expect(isStatus(alert.status)).toBe(true);

    alert.status = 'assigned';
    expect(isStatus(alert.status)).toBe(true);

    alert.status = 'resolved';
    expect(isStatus(alert.status)).toBe(true);
    expect(alert.status).toBe('resolved');
  });

  it('severity ranks exist for every member and order deterministically for grouping', () => {
    const severityRank: Record<AlertSeverity, number> = {
      critical: 3,
      high: 2,
      medium: 1,
      low: 0,
    };
    expectTypeOf<keyof typeof severityRank>().toEqualTypeOf<AlertSeverity>();
    expect(severityRank.critical).toBeGreaterThan(severityRank.high);
    expect(severityRank.high).toBeGreaterThan(severityRank.medium);
    expect(severityRank.medium).toBeGreaterThan(severityRank.low);
  });

  it('a status→style map stays exhaustive over the union (AlertRow pattern)', () => {
    const statusStyles: Record<AlertStatus, string> = {
      active: 'bg-red-100 text-red-800',
      acknowledged: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
    };
    expectTypeOf<keyof typeof statusStyles>().toEqualTypeOf<AlertStatus>();
    expect(Object.keys(statusStyles)).toEqual([...STATUSES]);
  });

  it('grouping keys derive deterministically from severity and status values', () => {
    const labelOf = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
    expect(labelOf('critical')).toBe('Critical');
    expect(labelOf('resolved')).toBe('Resolved');
  });
});

// ─── Fixture data (alertsData.ts) — observable, deterministic boundaries ─────
describe('AdminAlertsInbox types — fixture data contract', () => {
  it('every fixture satisfies the Alert contract at runtime', () => {
    expect(mockAlerts.length).toBeGreaterThan(0);
    for (const alert of mockAlerts) {
      expect(isSeverity(alert.severity), `severity: ${alert.severity} (${alert.id})`).toBe(true);
      expect(isStatus(alert.status), `status: ${alert.status} (${alert.id})`).toBe(true);
      for (const field of ['id', 'issuerId', 'issuerName', 'title', 'description', 'createdAt'] as const) {
        expect(typeof alert[field], `${field} (${alert.id})`).toBe('string');
        expect(alert[field].length, `${field} (${alert.id})`).toBeGreaterThan(0);
      }
    }
  });

  it('rejects representative invalid inputs at the boundary', () => {
    for (const bad of ['urgent', 'Critical', 'info', '', null, undefined, 42]) {
      expect(isSeverity(bad), `severity guard: ${String(bad)}`).toBe(false);
    }
    for (const bad of ['open', 'closed', 'pending', '', null, undefined, 7]) {
      expect(isStatus(bad), `status guard: ${String(bad)}`).toBe(false);
    }
  });

  it('fixture ids are unique and createdAt values are past ISO 8601 timestamps', () => {
    const ids = new Set(mockAlerts.map((a) => a.id));
    expect(ids.size).toBe(mockAlerts.length);
    for (const alert of mockAlerts) {
      const parsed = Date.parse(alert.createdAt);
      expect(Number.isNaN(parsed), alert.createdAt).toBe(false);
      expect(alert.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(parsed).toBeLessThanOrEqual(Date.now());
    }
  });

  it('fixtures exercise every severity and every lifecycle status', () => {
    expect(new Set(mockAlerts.map((a) => a.severity))).toEqual(new Set(SEVERITIES));
    expect(new Set(mockAlerts.map((a) => a.status))).toEqual(new Set(STATUSES));
  });

  it('assignedTo, when present, is always a non-empty string', () => {
    for (const alert of mockAlerts) {
      if (alert.assignedTo !== undefined) {
        expect(typeof alert.assignedTo).toBe('string');
        expect(alert.assignedTo.length).toBeGreaterThan(0);
      }
    }
  });

  it('status "assigned" carries an assignee (documented current fixture behavior)', () => {
    for (const alert of mockAlerts) {
      if (alert.status === 'assigned') {
        expect(typeof alert.assignedTo).toBe('string');
        expect((alert.assignedTo as string).length).toBeGreaterThan(0);
      }
    }
  });
});
