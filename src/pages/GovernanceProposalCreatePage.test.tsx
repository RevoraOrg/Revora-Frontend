import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { GovernanceProposalCreatePage } from './GovernanceProposalCreatePage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GovernanceProposalCreatePage', () => {
  it('renders the governance proposal form and navigates on cancel', () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter>
        <GovernanceProposalCreatePage />
      </MemoryRouter>,
    );

    const cancelBtn = screen.queryByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();
    if (cancelBtn) {
      fireEvent.click(cancelBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/startup/dashboard');
    }
  });
});
