import { describe, expect, it } from 'vitest';
import { mockAlerts } from './alertsData';
import type { Alert, AlertSeverity, AlertStatus } from './types';

const allowedSeverities: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];
const allowedStatuses: AlertStatus[] = ['active', 'acknowledged', 'assigned', 'resolved'];

const isValidAlert = (candidate: unknown): candidate is Alert => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const alert = candidate as Partial<Alert>;

  const hasRequiredText =
    typeof alert.id === 'string' && alert.id.trim().length > 0 &&
    typeof alert.issuerId === 'string' && alert.issuerId.trim().length > 0 &&
    typeof alert.issuerName === 'string' && alert.issuerName.trim().length > 0 &&
    typeof alert.title === 'string' && alert.title.trim().length > 0 &&
    typeof alert.description === 'string' && alert.description.trim().length > 0;

  const hasValidSeverity =
    typeof alert.severity === 'string' && allowedSeverities.includes(alert.severity as AlertSeverity);

  const hasValidStatus =
    typeof alert.status === 'string' && allowedStatuses.includes(alert.status as AlertStatus);

  const hasValidTimestamp =
    typeof alert.createdAt === 'string' && !Number.isNaN(Date.parse(alert.createdAt));

  const hasValidAssignedTo =
    alert.assignedTo === undefined ||
    (typeof alert.assignedTo === 'string' && alert.assignedTo.trim().length > 0);

  return (
    hasRequiredText &&
    hasValidSeverity &&
    hasValidStatus &&
    hasValidTimestamp &&
    hasValidAssignedTo
  );
};

describe('mockAlerts', () => {
  it('exports a valid alert collection that matches the alert contract', () => {
    expect(Array.isArray(mockAlerts)).toBe(true);
    expect(mockAlerts).toHaveLength(5);

    const ids = mockAlerts.map((alert) => alert.id);
    expect(new Set(ids).size).toBe(ids.length);

    expect(mockAlerts.every(isValidAlert)).toBe(true);
  });

  it('covers the primary alert states and severity variants used by the inbox', () => {
    expect(mockAlerts.map((alert) => alert.status)).toEqual([
      'active',
      'assigned',
      'acknowledged',
      'active',
      'resolved',
    ]);

    expect(mockAlerts.map((alert) => alert.severity)).toEqual([
      'critical',
      'high',
      'medium',
      'low',
      'critical',
    ]);

    expect(mockAlerts.find((alert) => alert.id === 'alert-2')?.assignedTo).toBe('admin-1');

    const countsByStatus = mockAlerts.reduce<Record<string, number>>((acc, alert) => {
      acc[alert.status] = (acc[alert.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(countsByStatus).toMatchObject({
      active: 2,
      assigned: 1,
      acknowledged: 1,
      resolved: 1,
    });

    const countsBySeverity = mockAlerts.reduce<Record<string, number>>((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] ?? 0) + 1;
      return acc;
    }, {});

    expect(countsBySeverity).toMatchObject({
      critical: 2,
      high: 1,
      medium: 1,
      low: 1,
    });

    expect(mockAlerts.every((alert) => Number.isFinite(Date.parse(alert.createdAt)))).toBe(true);
    expect(mockAlerts.every((alert) => Date.parse(alert.createdAt) <= Date.now())).toBe(true);
  });

  it('rejects representative invalid alert payloads deterministically', () => {
    expect(isValidAlert({ ...mockAlerts[0], severity: 'urgent' })).toBe(false);
    expect(isValidAlert({ ...mockAlerts[0], status: 'blocked' })).toBe(false);
    expect(isValidAlert({ ...mockAlerts[0], title: '' })).toBe(false);
    expect(isValidAlert({ ...mockAlerts[0], description: '' })).toBe(false);
    expect(isValidAlert({ ...mockAlerts[0], createdAt: 'not-a-date' })).toBe(false);
    expect(isValidAlert({ ...mockAlerts[0], assignedTo: '' })).toBe(false);
    expect(isValidAlert(null)).toBe(false);
  });
});
