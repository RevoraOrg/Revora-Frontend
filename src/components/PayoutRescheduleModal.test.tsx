import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PayoutRescheduleModal } from './PayoutRescheduleModal';

describe('PayoutRescheduleModal', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const conflicts = [
    { id: '1', type: 'soft' as const, message: 'Soft conflict' },
    { id: '2', type: 'hard' as const, message: 'Hard conflict' }
  ];

  it('renders correctly', () => {
    render(<PayoutRescheduleModal isOpen={true} onClose={onClose} onConfirm={onConfirm} initialDate="2099-07-28" conflicts={[]} />);
    expect(screen.getByText('Reschedule Payout')).toBeInTheDocument();
  });

  it('shows conflicts', () => {
    render(<PayoutRescheduleModal isOpen={true} onClose={onClose} onConfirm={onConfirm} initialDate="2099-07-28" conflicts={conflicts} />);
    expect(screen.getByText('Soft conflict')).toBeInTheDocument();
    expect(screen.getByText('Hard conflict')).toBeInTheDocument();
  });

  it('blocks confirm button when hard conflict exists', () => {
    render(<PayoutRescheduleModal isOpen={true} onClose={onClose} onConfirm={onConfirm} initialDate="2099-07-28" conflicts={conflicts} />);
    const confirmButton = screen.getByText('Confirm Reschedule');
    expect(confirmButton).toBeDisabled();
  });

  it('calls onConfirm when clicked after choosing a new future date', () => {
    const { container } = render(<PayoutRescheduleModal isOpen={true} onClose={onClose} onConfirm={onConfirm} initialDate="2099-07-28" conflicts={[]} />);
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2099-08-01' } });
    const confirmButton = screen.getByText('Confirm Reschedule');
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith('2099-08-01', '');
  });

  describe('date validation', () => {
    function setup(props: { currentDate?: string } = {}) {
      const confirm = vi.fn();
      const utils = render(
        <PayoutRescheduleModal isOpen={true} onClose={onClose} onConfirm={confirm} initialDate="2099-07-28" conflicts={[]} {...props} />,
      );
      const dateInput = utils.container.querySelector('input[type="date"]') as HTMLInputElement;
      return { confirm, dateInput };
    }

    it('blocks confirm while the date is unchanged', () => {
      const { dateInput } = setup();
      expect(screen.getByText('Date must be different from the current date')).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Confirm Reschedule')).toBeDisabled();
    });

    it('treats currentDate as the unchanged baseline when provided', () => {
      const { dateInput } = setup({ currentDate: '2099-09-09' });
      expect(screen.getByText('Confirm Reschedule')).toBeEnabled();
      fireEvent.change(dateInput, { target: { value: '2099-09-09' } });
      expect(screen.getByText('Date must be different from the current date')).toBeInTheDocument();
      expect(screen.getByText('Confirm Reschedule')).toBeDisabled();
    });

    it('rejects an empty date', () => {
      const { dateInput, confirm } = setup();
      fireEvent.change(dateInput, { target: { value: '' } });
      expect(screen.getByText('Date is required')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Confirm Reschedule'));
      expect(confirm).not.toHaveBeenCalled();
    });

    it('rejects a date in the past', () => {
      const { dateInput } = setup();
      fireEvent.change(dateInput, { target: { value: '2000-01-01' } });
      expect(screen.getByText('Date cannot be in the past')).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('aria-describedby');
      expect(screen.getByText('Confirm Reschedule')).toBeDisabled();
    });

    it('clears the error once a valid new date is chosen', () => {
      const { dateInput } = setup();
      fireEvent.change(dateInput, { target: { value: '2099-12-31' } });
      expect(dateInput).toHaveAttribute('aria-invalid', 'false');
      expect(dateInput).not.toHaveAttribute('aria-describedby');
      expect(screen.getByText('Confirm Reschedule')).toBeEnabled();
    });
  });
});
