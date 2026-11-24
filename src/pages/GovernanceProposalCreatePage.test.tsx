import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovernanceProposalCreatePage } from './GovernanceProposalCreatePage';
import type { ProposalDraft } from '../components/GovernanceProposalForm/GovernanceProposalForm';

const mockNavigate = vi.fn();

const mockDraft: ProposalDraft = {
  title: 'Increase Protocol Treasury Allocation',
  category: 'treasury',
  summary: 'Allocate 15% more funds to the protocol treasury.',
  rationale: 'Ensures long-term sustainability and ecosystem grants.',
  votingDurationDays: 7,
  quorumPercent: 20,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../components/GovernanceProposalForm/GovernanceProposalForm', () => ({
  GovernanceProposalForm: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit?: (draft: ProposalDraft) => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="governance-proposal-form">
      <button type="button" onClick={() => onSubmit?.(mockDraft)}>
        Submit Proposal
      </button>
      <button type="button" onClick={() => onCancel?.()}>
        Cancel
      </button>
    </div>
  ),
}));

describe('GovernanceProposalCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the governance proposal form', () => {
    render(
      <MemoryRouter>
        <GovernanceProposalCreatePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('governance-proposal-form')).toBeInTheDocument();
  });

  it('navigates to /startup/dashboard on submit', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <GovernanceProposalCreatePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit proposal/i }));

    expect(consoleSpy).toHaveBeenCalledWith('Proposal submitted:', mockDraft);
    expect(mockNavigate).toHaveBeenCalledWith('/startup/dashboard');
    consoleSpy.mockRestore();
  });

  it('navigates to /startup/dashboard on cancel', () => {
    render(
      <MemoryRouter>
        <GovernanceProposalCreatePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/startup/dashboard');
  });
});
