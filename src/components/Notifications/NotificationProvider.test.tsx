import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationBell from './NotificationBell';
import NotificationSettingsPage from '../../pages/NotificationSettingsPage';
import {
  DEFAULT_USER_ID,
  NotificationProvider,
  notificationPreferencesStorageKey,
  notificationsStorageKey,
  useNotifications,
  type NotificationContextValue,
} from './NotificationProvider';
import {
  createDefaultNotificationPreferences,
  type NotificationPreferencesValue,
} from './notificationPreferences';

let latest: NotificationContextValue | null = null;

function Probe() {
  latest = useNotifications();
  return (
    <>
      <span data-testid="unread">{latest.unreadCount}</span>
      <span data-testid="visible">{latest.notifications.map((n) => n.id).join(',')}</span>
      <span data-testid="stored">{latest.allNotifications.length}</span>
    </>
  );
}

function Wrapper({ userId }: { userId?: string }) {
  return (
    <NotificationProvider userId={userId}>
      <Probe />
    </NotificationProvider>
  );
}

function renderProvider(userId?: string) {
  return render(<Wrapper userId={userId} />);
}

function preferencesWith(overrides: Partial<NotificationPreferencesValue>): NotificationPreferencesValue {
  return { ...createDefaultNotificationPreferences('UTC'), ...overrides };
}

beforeEach(() => {
  localStorage.clear();
  latest = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotificationProvider', () => {
  it('seeds the feed from the mock notifications', () => {
    renderProvider();
    expect(screen.getByTestId('unread')).toHaveTextContent('2');
    expect(screen.getByTestId('visible')).toHaveTextContent('1,2,3');
  });

  it('exposes the current user id and default storage keys', () => {
    renderProvider();
    expect(latest?.userId).toBe(DEFAULT_USER_ID);
    expect(notificationsStorageKey()).toBe(`revora:notifications:${DEFAULT_USER_ID}`);
    expect(notificationPreferencesStorageKey()).toBe(
      `revora:notification-preferences:${DEFAULT_USER_ID}`,
    );
  });

  it('marks one notification read and persists it across remounts', () => {
    const first = renderProvider();
    act(() => latest?.markRead('1'));
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    first.unmount();

    renderProvider();
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(latest?.allNotifications.find((n) => n.id === '1')?.read).toBe(true);
  });

  it('marks every notification read and persists the change', () => {
    const first = renderProvider();
    act(() => latest?.markAllRead());
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
    first.unmount();

    renderProvider();
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
  });

  it('dismisses a notification and persists the removal', () => {
    const first = renderProvider();
    act(() => latest?.dismiss('2'));
    expect(screen.getByTestId('visible')).toHaveTextContent('1,3');
    expect(screen.getByTestId('stored')).toHaveTextContent('2');
    first.unmount();

    renderProvider();
    expect(screen.getByTestId('visible')).toHaveTextContent('1,3');
  });

  it('keeps state isolated between users and reloads on user change', () => {
    const { rerender } = render(<Wrapper userId="alice" />);
    act(() => latest?.markAllRead());
    expect(screen.getByTestId('unread')).toHaveTextContent('0');

    rerender(<Wrapper userId="bob" />);
    expect(latest?.userId).toBe('bob');
    expect(screen.getByTestId('unread')).toHaveTextContent('2');

    rerender(<Wrapper userId="alice" />);
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
  });

  it('falls back to defaults for corrupt stored payloads', () => {
    localStorage.setItem(notificationsStorageKey(), '{not json');
    localStorage.setItem(notificationPreferencesStorageKey(), 'null');
    renderProvider();

    expect(screen.getByTestId('unread')).toHaveTextContent('2');
    expect(latest?.preferences).toEqual(createDefaultNotificationPreferences(latest?.preferences.quietHours.timeZone));
  });

  it('survives blocked localStorage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => {
      renderProvider();
      act(() => latest?.markRead('1'));
      act(() => latest?.setPreferences(createDefaultNotificationPreferences()));
    }).not.toThrow();
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
  });

  it('persists preference changes and restores them after a remount', () => {
    const first = renderProvider();
    const next = preferencesWith({
      matrix: {
        distribution: { inApp: false, email: true, sms: false },
        report: { inApp: true, email: false, sms: false },
        compliance: { inApp: true, email: false, sms: false },
        governance: { inApp: true, email: false, sms: false },
      },
    });

    act(() => latest?.setPreferences(next));
    expect(
      JSON.parse(localStorage.getItem(notificationPreferencesStorageKey())!),
    ).toEqual(next);
    first.unmount();

    renderProvider();
    expect(latest?.preferences.matrix.distribution.inApp).toBe(false);
    expect(latest?.preferences.matrix.report.inApp).toBe(true);
  });

  it('filters the visible feed when in-app preferences change', () => {
    renderProvider();
    expect(screen.getByTestId('unread')).toHaveTextContent('2');

    const matrix = createDefaultNotificationPreferences('UTC').matrix;
    act(() => latest?.setPreferences(preferencesWith({
      matrix: { ...matrix, distribution: { inApp: false, email: false, sms: false } },
    })));

    expect(screen.getByTestId('visible')).toHaveTextContent('2,3');
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
  });

  it('generates mock notifications that respect channel preferences', () => {
    renderProvider();
    act(() => latest?.dismiss('1'));
    act(() => latest?.dismiss('2'));
    act(() => latest?.dismiss('3'));

    const matrix = createDefaultNotificationPreferences('UTC').matrix;
    act(() => latest?.setPreferences(preferencesWith({
      matrix: {
        ...matrix,
        governance: { inApp: true, email: false, sms: false },
        report: { inApp: false, email: false, sms: false },
      },
    })));
    act(() => latest?.generateNotifications());

    expect(screen.getByTestId('visible')).toHaveTextContent('4');
  });

  it('suppresses generated notifications during quiet hours unless overridden', () => {
    renderProvider();
    ['1', '2', '3'].forEach((id) => act(() => latest?.dismiss(id)));

    const base = preferencesWith({
      quietHours: { enabled: true, startTime: '00:00', endTime: '23:59', timeZone: 'UTC' },
    });
    act(() => latest?.setPreferences(base));
    act(() => latest?.generateNotifications());
    expect(screen.getByTestId('visible')).toBeEmptyDOMElement();

    act(() => latest?.setPreferences({
      ...base,
      quietHoursOverride: { ...base.quietHoursOverride, compliance: true },
    }));
    act(() => latest?.generateNotifications());
    expect(screen.getByTestId('visible')).toHaveTextContent('3');
  });

  it('writes preference UI changes through the provider', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider userId="prefs-ui">
        <Probe />
        <NotificationSettingsPage />
      </NotificationProvider>,
    );

    await user.click(screen.getAllByLabelText('Toggle In-App notifications for all categories')[0]);
    expect(screen.getByTestId('visible')).toBeEmptyDOMElement();
    expect(
      JSON.parse(localStorage.getItem(notificationPreferencesStorageKey('prefs-ui'))!).matrix
        .distribution.inApp,
    ).toBe(false);
  });
});

describe('NotificationBell with provider', () => {
  it('reads the shared feed and announces count changes in an aria-live region', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider userId="bell-live">
        <NotificationBell />
        <Probe />
      </NotificationProvider>,
    );

    expect(screen.getByTestId('nb-announcer')).toHaveTextContent('You have 2 unread notifications.');
    await user.click(screen.getByTestId('nb-trigger'));
    await user.click(screen.getByRole('button', { name: 'Mark Payout received as read' }));

    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(screen.getByTestId('nb-announcer')).toHaveTextContent('You have 1 unread notification.');
  });

  it('generates only preference-approved notifications from the panel', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider userId="bell-generate">
        <NotificationBell />
        <Probe />
      </NotificationProvider>,
    );

    act(() => latest?.setPreferences(preferencesWith({
      matrix: {
        distribution: { inApp: false, email: false, sms: false },
        report: { inApp: false, email: false, sms: false },
        compliance: { inApp: false, email: false, sms: false },
        governance: { inApp: true, email: false, sms: false },
      },
    })));
    await user.click(screen.getByTestId('nb-trigger'));
    await user.click(screen.getByRole('button', { name: 'Generate sample' }));

    expect(screen.getByTestId('visible')).toHaveTextContent('4');
  });

  it('marks all as read and dismisses through the provider', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider userId="bell-actions">
        <NotificationBell />
        <Probe />
      </NotificationProvider>,
    );

    await user.click(screen.getByTestId('nb-trigger'));
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
    expect(screen.getByTestId('nb-announcer')).toHaveTextContent('You have no unread notifications.');

    await user.click(screen.getByRole('button', { name: 'Dismiss Report due' }));
    expect(screen.getByTestId('visible')).toHaveTextContent('1,3');
  });
});
