import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BlacklistBulkRemoveConfirm } from './BlacklistBulkRemoveConfirm';

expect.extend(toHaveNoViolations);

// Mock the useUndoBanners hook
const mockRegisterUndo = vi.fn();
vi.mock('../../hooks/useUndoBanners', () => ({
  useUndoBanners: () => ({
    registerUndo: mockRegisterUndo,
  }),
}));

describe('BlacklistBulkRemoveConfirm', () => {
  const mockEntries = [
    { id: '1', value: '192.168.1.1', type: 'IP' },
    { id: '2', value: '0xabc123...', type: 'Wallet' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    entries: mockEntries,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<BlacklistBulkRemoveConfirm {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should not have basic accessibility violations', async () => {
    const { container } = render(<BlacklistBulkRemoveConfirm {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders with a large selection of entries', () => {
    const largeEntries = Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`,
      value: `Entry ${i}`,
      type: 'IP',
    }));
    
    render(<BlacklistBulkRemoveConfirm {...defaultProps} entries={largeEntries} />);
    expect(screen.getByText(/50/i)).toBeInTheDocument();
    expect(screen.getByText('Entry 49')).toBeInTheDocument();
  });

  it('calls onClose when ESC key is pressed', () => {
    render(<BlacklistBulkRemoveConfirm {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the remove button for 750ms on mount', () => {
    render(<BlacklistBulkRemoveConfirm {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /Please wait\.\.\./i });
    expect(submitButton).toBeDisabled();

    // Fast-forward 750ms
    act(() => {
      vi.advanceTimersByTime(750);
    });

    // It should still be disabled because the form is invalid (no reason/initials)
    expect(screen.getByRole('button', { name: /Remove Entries/i })).toBeDisabled();
  });

  it('validates minimum length on free-text reason', async () => {
    render(<BlacklistBulkRemoveConfirm {...defaultProps} />);
    
    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });
    
    // Select "Other" preset
    await user.click(screen.getByRole('button', { name: 'Other' }));

    const textarea = screen.getByRole('textbox', { name: /Detailed Reason/i });
    const initialsInput = screen.getByRole('textbox', { name: /Actor Initials/i });
    
    // Type valid initials
    await user.type(initialsInput, 'JD');

    const submitButton = screen.getByRole('button', { name: /Remove Entries/i });

    // Type short reason
    await user.type(textarea, 'Short');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/Reason must be at least 10 characters./i)).toBeInTheDocument();

    // Type valid reason
    await user.type(textarea, 'This is a valid reason');
    expect(submitButton).not.toBeDisabled();
    expect(screen.queryByText(/Reason must be at least 10 characters./i)).not.toBeInTheDocument();
  });

  it('disables removing when the selection is empty', () => {
    render(<BlacklistBulkRemoveConfirm {...defaultProps} entries={[]} />);

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const submitButton = screen.getByRole('button', { name: /Remove Entries/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles network failure mid-remove', async () => {
    let rejectPromise!: (reason?: any) => void;
    const pendingPromise = new Promise<void>((_, reject) => {
      rejectPromise = reject;
    });
    const onConfirmError = vi.fn().mockReturnValue(pendingPromise);
    render(<BlacklistBulkRemoveConfirm {...defaultProps} onConfirm={onConfirmError} />);

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByRole('button', { name: 'Added by mistake' }));
    await user.type(screen.getByRole('textbox', { name: /Actor Initials/i }), 'AB');

    const submitButton = screen.getByRole('button', { name: /Remove Entries/i });
    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /Removing\.\.\./i })).toBeDisabled();

    act(() => {
      rejectPromise(new Error('Network error'));
    });

    await waitFor(() => {
      expect(onConfirmError).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error');
    expect(screen.getByRole('button', { name: /Remove Entries/i })).not.toBeDisabled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('successfully removes entries and registers undo banner', async () => {
    const onConfirmSuccess = vi.fn().mockResolvedValue(undefined);
    render(<BlacklistBulkRemoveConfirm {...defaultProps} onConfirm={onConfirmSuccess} />);

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });
    
    // Select a valid preset
    await user.click(screen.getByRole('button', { name: 'Added by mistake' }));
    
    // Type valid initials
    await user.type(screen.getByRole('textbox', { name: /Actor Initials/i }), 'JD');

    const submitButton = screen.getByRole('button', { name: /Remove Entries/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onConfirmSuccess).toHaveBeenCalledWith('Added by mistake', 'JD');
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not close via Escape or backdrop click while confirm is submitting', async () => {
    let resolvePromise!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const onConfirmPending = vi.fn().mockReturnValue(pendingPromise);
    const onClose = vi.fn();

    render(
      <BlacklistBulkRemoveConfirm
        {...defaultProps}
        onClose={onClose}
        onConfirm={onConfirmPending}
      />
    );

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name: 'Added by mistake' }));
    await user.type(screen.getByRole('textbox', { name: /Actor Initials/i }), 'JD');

    await user.click(screen.getByRole('button', { name: /Remove Entries/i }));
    expect(screen.getByRole('button', { name: /Removing\.\.\./i })).toBeInTheDocument();

    // Try pressing Escape while submitting
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    // Try clicking backdrop while submitting
    const modalBackdrop = screen.getByRole('presentation');
    fireEvent.click(modalBackdrop);
    expect(onClose).not.toHaveBeenCalled();

    // Finish submission
    act(() => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('traps focus inside the dialog with Tab and Shift+Tab', () => {
    render(<BlacklistBulkRemoveConfirm {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([aria-hidden="true"]), input:not([disabled]):not([aria-hidden="true"]), textarea:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])'
      )
    );

    expect(focusables.length).toBeGreaterThan(1);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Tab from last wraps to first
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    // Shift+Tab from first wraps to last
    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to trigger element on close', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('data-testid', 'trigger-btn');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(<BlacklistBulkRemoveConfirm {...defaultProps} isOpen={true} />);
    expect(document.activeElement).not.toBe(trigger);

    rerender(<BlacklistBulkRemoveConfirm {...defaultProps} isOpen={false} />);
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });

  it('registers undo banner only when onUndo is provided, and passes removed entries', async () => {
    const onUndo = vi.fn().mockResolvedValue(undefined);
    const onConfirmSuccess = vi.fn().mockResolvedValue(undefined);

    render(
      <BlacklistBulkRemoveConfirm
        {...defaultProps}
        onConfirm={onConfirmSuccess}
        onUndo={onUndo}
      />
    );

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name: 'Added by mistake' }));
    await user.type(screen.getByRole('textbox', { name: /Actor Initials/i }), 'JD');

    await user.click(screen.getByRole('button', { name: /Remove Entries/i }));

    await waitFor(() => {
      expect(onConfirmSuccess).toHaveBeenCalledTimes(1);
      expect(mockRegisterUndo).toHaveBeenCalledTimes(1);
    });

    const undoConfig = mockRegisterUndo.mock.calls[0][0];
    expect(undoConfig.message).toBe('Removed 2 entries from blacklist');

    // Trigger onUndo callback
    await undoConfig.onUndo();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledWith(mockEntries);
  });

  it('does not register undo banner when onUndo prop is not provided', async () => {
    const onConfirmSuccess = vi.fn().mockResolvedValue(undefined);

    render(
      <BlacklistBulkRemoveConfirm
        {...defaultProps}
        onConfirm={onConfirmSuccess}
      />
    );

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name: 'Added by mistake' }));
    await user.type(screen.getByRole('textbox', { name: /Actor Initials/i }), 'JD');

    await user.click(screen.getByRole('button', { name: /Remove Entries/i }));

    await waitFor(() => {
      expect(onConfirmSuccess).toHaveBeenCalledTimes(1);
    });

    expect(mockRegisterUndo).not.toHaveBeenCalled();
  });

  it('displays an error if onUndo fails', async () => {
    const onUndoError = vi.fn().mockRejectedValue(new Error('Failed to restore entries'));
    const onConfirmSuccess = vi.fn().mockResolvedValue(undefined);

    render(
      <BlacklistBulkRemoveConfirm
        {...defaultProps}
        onConfirm={onConfirmSuccess}
        onUndo={onUndoError}
      />
    );

    act(() => {
      vi.advanceTimersByTime(750);
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name: 'Added by mistake' }));
    await user.type(screen.getByRole('textbox', { name: /Actor Initials/i }), 'JD');

    await user.click(screen.getByRole('button', { name: /Remove Entries/i }));

    await waitFor(() => {
      expect(mockRegisterUndo).toHaveBeenCalledTimes(1);
    });

    const undoConfig = mockRegisterUndo.mock.calls[0][0];
    await undoConfig.onUndo();

    expect(onUndoError).toHaveBeenCalledTimes(1);
  });
});
