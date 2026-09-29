import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import NotificationPanel from './NotificationPanel';
import type { Notification } from './notificationsData';

const notification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notification-1',
  title: 'Payout received',
  time: '2h ago',
  read: false,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotificationPanel', () => {
  it('renders the dialog and notification details for a populated list', () => {
    render(
      <NotificationPanel
        notifications={[
          notification(),
          notification({ id: 'notification-2', title: 'Report due', time: '1d ago', read: true }),
        ]}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Payout received')).toBeInTheDocument();
    expect(screen.getByText('Report due')).toBeInTheDocument();

    const indicators = dialog.querySelectorAll('li span[style*="background-color"]');
    expect(indicators[0]).toHaveStyle({ backgroundColor: 'rgb(239, 68, 68)' });
    expect(indicators[1]).toHaveStyle({ backgroundColor: 'rgb(107, 114, 128)' });
  });

  it('renders the empty state for an empty notification list', () => {
    render(<NotificationPanel notifications={[]} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
    expect(screen.getByText("You're all caught up! New notifications will appear here when there's activity on your account.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('transitions between populated and empty states when notifications change', () => {
    const { rerender } = render(
      <NotificationPanel notifications={[notification()]} onClose={vi.fn()} />,
    );

    expect(screen.getByRole('listitem')).toBeInTheDocument();

    rerender(<NotificationPanel notifications={[]} onClose={vi.fn()} />);

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
  });

  it('calls onClose when the close action is activated', () => {
    const onClose = vi.fn();
    render(<NotificationPanel notifications={[]} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes the mark-all-read action without changing the supplied notifications', () => {
    const notifications = [notification()];
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    render(<NotificationPanel notifications={notifications} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    expect(log).toHaveBeenCalledWith('Mark all as read');
    expect(screen.getByRole('listitem')).toBeInTheDocument();
    expect(notifications[0].read).toBe(false);
  });

});
