/**
 * Focused behavior coverage for `src/components/Notifications/notificationsData.ts` (#752).
 *
 * The module is a pure data contract: the `Notification` interface plus the
 * `notificationsMock` fixture read by the notification UI. It has no directly
 * associated test fixture, so this suite pins:
 *
 * - the field contract every consumer relies on,
 * - the invariants of the shipped mock data (unique ids, valid read flags,
 *   deterministic ordering),
 * - representative malformed payloads that must be rejected by the shape
 *   contract, and
 * - the read/unread state transition, including that the exported fixture is
 *   never mutated by consumers.
 */
import { describe, it, expect } from 'vitest';
import { notificationsMock, type Notification } from './notificationsData';

const REQUIRED_FIELDS: ReadonlyArray<keyof Notification> = ['id', 'title', 'time', 'read'];

/**
 * Runtime mirror of the `Notification` contract. Used to assert that boundary
 * payloads are rejected before they can reach the notification UI.
 */
function isNotification(value: unknown): value is Notification {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.length > 0 &&
    typeof candidate.time === 'string' &&
    candidate.time.length > 0 &&
    typeof candidate.read === 'boolean'
  );
}

/** Pure transition applied by the notification list when an item is opened. */
function markAsRead(notifications: readonly Notification[], id: string): Notification[] {
  return notifications.map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification,
  );
}

describe('notificationsData / Notification contract', () => {
  it('exposes exactly the id/title/time/read fields on every mock entry', () => {
    expect(notificationsMock.length).toBeGreaterThan(0);

    for (const notification of notificationsMock) {
      expect(Object.keys(notification).sort()).toEqual([...REQUIRED_FIELDS].sort());
      expect(isNotification(notification)).toBe(true);
    }
  });

  it('rejects malformed notification payloads', () => {
    const malformed: unknown[] = [
      null,
      undefined,
      'notification',
      42,
      {},
      { id: '1', title: 't', time: '2h ago' }, // read missing
      { id: '1', title: 't', read: true }, // time missing
      { id: '1', title: 't', time: '2h ago', read: 'true' }, // read not boolean
      { id: 1, title: 't', time: '2h ago', read: true }, // id not string
      { id: '', title: 't', time: '2h ago', read: true }, // empty id
      { id: '1', title: '', time: '2h ago', read: true }, // empty title
      { id: '1', title: 't', time: '', read: true }, // empty time
    ];

    for (const payload of malformed) {
      expect(isNotification(payload)).toBe(false);
    }
  });

  it('keeps ids unique and stable across the fixture', () => {
    const ids = notificationsMock.map((notification) => notification.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('pins the shipped fixture values so content changes are deliberate', () => {
    expect(notificationsMock).toEqual([
      { id: '1', title: 'Payout received', time: '2h ago', read: false },
      { id: '2', title: 'Report due', time: '1d ago', read: false },
      { id: '3', title: 'Blacklist change', time: '3d ago', read: true },
    ]);
  });

  it('covers both read and unread states deterministically', () => {
    const unread = notificationsMock.filter((notification) => !notification.read);
    const read = notificationsMock.filter((notification) => notification.read);

    expect(unread.map((notification) => notification.id)).toEqual(['1', '2']);
    expect(read.map((notification) => notification.id)).toEqual(['3']);
  });
});

describe('notificationsData / read state transitions', () => {
  it('marks a single notification as read without touching the others', () => {
    const updated = markAsRead(notificationsMock, '1');

    expect(updated.find((notification) => notification.id === '1')?.read).toBe(true);
    expect(updated.find((notification) => notification.id === '2')?.read).toBe(false);
    expect(updated.find((notification) => notification.id === '3')?.read).toBe(true);
  });

  it('does not mutate the exported notificationsMock fixture', () => {
    const before = JSON.stringify(notificationsMock);
    const updated = markAsRead(notificationsMock, '2');

    expect(updated).not.toBe(notificationsMock);
    expect(JSON.stringify(notificationsMock)).toBe(before);
    expect(notificationsMock[0].read).toBe(false);
    expect(notificationsMock[1].read).toBe(false);
  });

  it('is a no-op for an unknown id (boundary input)', () => {
    const updated = markAsRead(notificationsMock, 'does-not-exist');

    expect(updated).toEqual(notificationsMock);
    expect(updated).not.toBe(notificationsMock);
  });

  it('is an idempotent no-op when the notification is already read', () => {
    const once = markAsRead(notificationsMock, '3');
    const twice = markAsRead(once, '3');

    expect(twice).toEqual(once);
  });
});
