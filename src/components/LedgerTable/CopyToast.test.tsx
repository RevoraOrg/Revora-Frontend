import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CopyToast } from './CopyToast';

describe('CopyToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is not visible when rowCount is null', () => {
    render(<CopyToast rowCount={null} onDismiss={vi.fn()} />);
    const toast = screen.getByTestId('copy-toast');
    expect(toast).toHaveStyle({ opacity: '0' });
  });

  it('becomes visible when rowCount is provided', () => {
    render(<CopyToast rowCount={3} onDismiss={vi.fn()} />);
    const toast = screen.getByTestId('copy-toast');
    expect(toast).toHaveStyle({ opacity: '1' });
  });

  it('shows singular "row" for count of 1', () => {
    render(<CopyToast rowCount={1} onDismiss={vi.fn()} />);
    expect(screen.getByText('1 row copied to clipboard')).toBeInTheDocument();
  });

  it('shows plural "rows" for count > 1', () => {
    render(<CopyToast rowCount={5} onDismiss={vi.fn()} />);
    expect(screen.getByText('5 rows copied to clipboard')).toBeInTheDocument();
  });

  it('calls onDismiss after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<CopyToast rowCount={2} onDismiss={onDismiss} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not call onDismiss before 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<CopyToast rowCount={2} onDismiss={onDismiss} />);
    act(() => vi.advanceTimersByTime(2999));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('has role="status" and aria-live="polite"', () => {
    render(<CopyToast rowCount={1} onDismiss={vi.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('hides again when rowCount resets to null', () => {
    const { rerender } = render(<CopyToast rowCount={3} onDismiss={vi.fn()} />);
    rerender(<CopyToast rowCount={null} onDismiss={vi.fn()} />);
    const toast = screen.getByTestId('copy-toast');
    expect(toast).toHaveStyle({ opacity: '0' });
  });
});
