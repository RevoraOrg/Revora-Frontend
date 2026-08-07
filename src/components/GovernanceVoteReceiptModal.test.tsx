import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GovernanceVoteReceiptModal } from './GovernanceVoteReceiptModal';

describe('GovernanceVoteReceiptModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    proposalTitle: 'Test Proposal',
    voteChoice: 'For' as const,
    timestamp: '2026-08-07 10:00:00 UTC',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: 'confirmed' as const,
  };

  it('renders receipt details in an accessible dialog', () => {
    render(<GovernanceVoteReceiptModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { name: /vote cast successfully/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    expect(screen.getByText('For')).toBeInTheDocument();
    expect(screen.getByText('2026-08-07 10:00:00 UTC')).toBeInTheDocument();
    expect(screen.getByText(/0x1234...5678/)).toBeInTheDocument();
  });

  it('copies the transaction hash when the copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<GovernanceVoteReceiptModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /copy transaction hash/i }));

    expect(writeTextMock).toHaveBeenCalledWith(defaultProps.txHash);
    expect(screen.getByText(/copied!/i)).toBeInTheDocument();
  });
});
