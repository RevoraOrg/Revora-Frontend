import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RescheduleModal } from './RescheduleModal';
import { PayoutEvent } from './PayoutTimeline';

describe('RescheduleModal', () => {
  const payout: PayoutEvent = {
    id: 'p1',
    date: '2026-09-27',
    label: 'Payout 1',
    status: 'scheduled',
  };

  const allPayouts: PayoutEvent[] = [
    payout,
    { id: 'p2', date: '2026-09-28', label: 'Processing Payout', status: 'processing' },
    { id: 'p3', date: '2026-10-15', label: 'Other Payout', status: 'scheduled' },
  ];

  it('renders correctly with initial date', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RescheduleModal
        payout={payout}
        allPayouts={allPayouts}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Reschedule Payout')).toBeInTheDocument();
    const dateInput = screen.getByLabelText('New Date:') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-09-27');
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RescheduleModal
        payout={payout}
        allPayouts={allPayouts}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('updates audit note when typing', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <RescheduleModal
        payout={payout}
        allPayouts={allPayouts}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const noteInput = screen.getByLabelText('Audit Note:');
    await user.type(noteInput, 'Test reason');
    expect(noteInput).toHaveValue('Test reason');
  });

  it('shows soft conflict but allows confirmation', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <RescheduleModal
        payout={payout}
        allPayouts={allPayouts}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const dateInput = screen.getByLabelText('New Date:');
    // Set date to 2026-09-29, which is within 7 days of 2026-09-28 (processing)
    fireEvent.change(dateInput, { target: { value: '2026-09-29' } });

    expect(screen.getByText(/Warning: Payout is scheduled within 7 days/)).toBeInTheDocument();
    
    const confirmButton = screen.getByRole('button', { name: 'Confirm Reschedule' });
    expect(confirmButton).not.toBeDisabled();

    await user.type(screen.getByLabelText('Audit Note:'), 'Soft conflict note');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('2026-09-29', 'Soft conflict note');
  });

  it('shows hard conflict and disables confirmation', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RescheduleModal
        payout={payout}
        allPayouts={allPayouts}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const dateInput = screen.getByLabelText('New Date:');
    // Set date to 2026-10-15, which is exactly the date of another payout (hard conflict)
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

    expect(screen.getByText(/Conflict: Another payout.*is already scheduled/)).toBeInTheDocument();
    
    const confirmButton = screen.getByRole('button', { name: 'Confirm Reschedule' });
    expect(confirmButton).toBeDisabled();
  });

  it('calls onClose when close (X) icon is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RescheduleModal
        payout={payout}
        allPayouts={allPayouts}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
