/**
 * Focused failure-path and state-transition coverage for `ErrorRecoveryPanel`.
 *
 * Complements `ErrorRecoveryPanel.test.tsx` by pinning the `isOpen` false branch
 * (the null return), the three dismissal routes (overlay, Escape, close button),
 * retry/discard side effects, group ordering, the singular/plural item count,
 * `markAllRead` on open, and focus management.
 */

import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ErrorRecoveryPanel } from './ErrorRecoveryPanel';
import { useErrorSnapshots, resetGlobalState } from '../../hooks/useErrorSnapshots';
import type { UseErrorSnapshotsResult } from '../../hooks/useErrorSnapshots';

let api: UseErrorSnapshotsResult;

const Harness: React.FC<{ isOpen: boolean; onClose?: () => void }> = ({
  isOpen,
  onClose = () => undefined,
}) => {
  api = useErrorSnapshots();
  return <ErrorRecoveryPanel isOpen={isOpen} onClose={onClose} />;
};

function addSnapshot(overrides: Record<string, unknown> = {}): string {
  let id = '';
  act(() => {
    id = api.addSnapshot({
      group: 'Forms',
      title: 'Failed to save draft',
      ...overrides,
    } as any);
  });
  return id;
}

describe('ErrorRecoveryPanel behavior', () => {
  beforeEach(() => {
    resetGlobalState();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing and never calls onClose while isOpen is false', () => {
    const onClose = vi.fn();
    render(<Harness isOpen={false} onClose={onClose} />);

    expect(screen.queryByTestId('error-panel')).toBeNull();
    expect(screen.queryByTestId('error-panel-overlay')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the overlay is clicked', () => {
    const onClose = vi.fn();
    render(<Harness isOpen onClose={onClose} />);

    fireEvent.click(screen.getByTestId('error-panel-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Harness isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = vi.fn();
    render(<Harness isOpen onClose={onClose} />);

    fireEvent.click(screen.getByTestId('error-panel-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes the retry callback and then removes the snapshot', () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    render(<Harness isOpen />);
    addSnapshot({ title: 'Retry me', onRetry, onDiscard });

    fireEvent.click(screen.getByRole('button', { name: /retry retry me/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.queryByText('Retry me')).toBeNull();
  });

  it('still removes a snapshot that has no retry callback', () => {
    render(<Harness isOpen />);
    addSnapshot({ title: 'No handler' });

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /retry no handler/i })),
    ).not.toThrow();
    expect(screen.queryByText('No handler')).toBeNull();
  });

  it('invokes the discard callback and then removes the snapshot', () => {
    const onDiscard = vi.fn();
    render(<Harness isOpen />);
    addSnapshot({ title: 'Discard me', onDiscard });

    fireEvent.click(screen.getByRole('button', { name: /discard discard me/i }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard me')).toBeNull();
  });

  it('orders group sections by GROUP_ORDER, not insertion order', () => {
    render(<Harness isOpen />);
    addSnapshot({ group: 'Forms', title: 'Form failure' });
    addSnapshot({ group: 'Transactions', title: 'Tx failure' });
    addSnapshot({ group: 'Other', title: 'Other failure' });

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Transactions', 'Forms', 'Other']);
  });

  it('uses singular and plural copy for the recoverable item count', () => {
    render(<Harness isOpen />);

    addSnapshot({ title: 'One' });
    expect(screen.getByText('1 recoverable item')).toBeInTheDocument();

    addSnapshot({ title: 'Two' });
    expect(screen.getByText('2 recoverable items')).toBeInTheDocument();
  });

  it('hides Clear All when there is nothing to clear and shows it otherwise', () => {
    render(<Harness isOpen />);
    expect(screen.queryByRole('button', { name: /clear all/i })).toBeNull();

    addSnapshot({ title: 'Something' });
    expect(screen.getByRole('button', { name: /clear all snapshots/i })).toBeInTheDocument();
  });

  it('marks all snapshots read when the panel transitions to open', () => {
    const { rerender } = render(<Harness isOpen={false} />);
    addSnapshot({ title: 'Unread' });
    expect(api.unreadCount).toBe(1);

    act(() => {
      rerender(<Harness isOpen />);
    });

    expect(api.unreadCount).toBe(0);
  });

  it('moves focus to the close button once the panel is open', () => {
    vi.useFakeTimers();
    render(<Harness isOpen />);

    act(() => {
      vi.runAllTimers();
    });

    expect(document.activeElement).toBe(screen.getByTestId('error-panel-close-btn'));
  });

  it('restores focus to the previously focused element when closed', () => {
    vi.useFakeTimers();

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const { rerender } = render(<Harness isOpen />);
    // The open transition captures `outside` and then focuses the close button.
    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(screen.getByTestId('error-panel-close-btn'));

    act(() => {
      rerender(<Harness isOpen={false} />);
    });

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
