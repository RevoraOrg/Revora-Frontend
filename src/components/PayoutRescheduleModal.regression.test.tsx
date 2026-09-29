/**
 * Regression coverage for `ConflictType` / `PayoutRescheduleModalProps` failure
 * handling (#758).
 *
 * Evidence: `src/components/PayoutRescheduleModal.tsx:30` contains
 * `if (!isOpen) return null;`. The existing suite only renders the modal while
 * open, so the closed/`null` contract and the conflict-driven failure path were
 * unverified. These tests pin:
 *
 * - the closed branch returns `null` and renders no controls,
 * - the closed branch short-circuits before it reads `conflicts`, so a missing
 *   list cannot throw, and
 * - the neighbouring normal path: soft-vs-hard conflict gating, note/date
 *   propagation, and the state carried across a close/reopen transition.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { PayoutRescheduleModal, type Conflict } from './PayoutRescheduleModal';

const HARD_CONFLICT: Conflict = {
  id: 'hard-1',
  type: 'hard',
  message: 'Overlaps a locked distribution window',
};
const SOFT_CONFLICT: Conflict = {
  id: 'soft-1',
  type: 'soft',
  message: 'Falls on a market holiday',
};

const noop = () => {};

function renderModal(props: Partial<React.ComponentProps<typeof PayoutRescheduleModal>> = {}) {
  return render(
    <PayoutRescheduleModal
      isOpen
      onClose={noop}
      onConfirm={noop}
      initialDate="2026-07-28"
      conflicts={[]}
      {...props}
    />,
  );
}

describe('PayoutRescheduleModal closed-state contract', () => {
  it('returns null when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Reschedule Payout')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('returns null even when hard conflicts are supplied while closed', () => {
    const { container } = renderModal({ isOpen: false, conflicts: [HARD_CONFLICT] });

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(HARD_CONFLICT.message)).toBeNull();
  });

  it('short-circuits before reading conflicts (boundary: missing list while closed)', () => {
    const { container } = renderModal({
      isOpen: false,
      conflicts: undefined as unknown as Conflict[],
    });

    expect(container.firstChild).toBeNull();
  });

  it('does not call onClose or onConfirm just because it is closed', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    renderModal({ isOpen: false, onClose, onConfirm });

    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('PayoutRescheduleModal conflict handling (normal path)', () => {
  it('keeps Confirm enabled when only soft conflicts are present', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ conflicts: [SOFT_CONFLICT], onConfirm });

    expect(screen.getByText(SOFT_CONFLICT.message)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Confirm Reschedule' });
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks Confirm and does not call onConfirm when a hard conflict exists', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ conflicts: [SOFT_CONFLICT, HARD_CONFLICT], onConfirm });

    const confirm = screen.getByRole('button', { name: 'Confirm Reschedule' });
    expect(confirm).toBeDisabled();

    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('forwards the edited date and audit note to onConfirm (boundary: empty conflicts)', () => {
    const onConfirm = vi.fn();
    const { container } = renderModal({ conflicts: [], onConfirm });

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-07-28');

    fireEvent.change(dateInput, { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByPlaceholderText('Reason for rescheduling...'), {
      target: { value: 'Holder asked for a later window' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Reschedule' }));

    expect(onConfirm).toHaveBeenCalledWith('2026-08-15', 'Holder asked for a later window');
  });

  it('calls onClose from Cancel without confirming', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ onClose, onConfirm });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('preserves unsaved input across a close/reopen state transition', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            open modal
          </button>
          <PayoutRescheduleModal
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={noop}
            initialDate="2026-07-28"
            conflicts={[]}
          />
        </div>
      );
    }

    const user = userEvent.setup();
    const { container } = render(<Harness />);

    expect(screen.queryByText('Reschedule Payout')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'open modal' }));
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByPlaceholderText('Reason for rescheduling...'), {
      target: { value: 'draft note' },
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(container.querySelector('input[type="date"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'open modal' }));
    const reopenedInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(reopenedInput.value).toBe('2026-09-01');
    expect(screen.getByPlaceholderText('Reason for rescheduling...')).toHaveValue('draft note');
  });
});
