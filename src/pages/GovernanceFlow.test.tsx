import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { routes } from '../App';
import { WalletConnectionProvider } from '../components/WalletConnection/WalletConnectionContext';
import {
  GOVERNANCE_DELEGATION_STORAGE_KEY,
  GOVERNANCE_PROPOSALS_STORAGE_KEY,
} from '../context/GovernanceProposalsContext';
import { EXPLORER_BASE } from '../constants/stellar';

function renderGovernanceAt(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return {
    router,
    ...render(
      <WalletConnectionProvider>
        <RouterProvider router={router} />
      </WalletConnectionProvider>,
    ),
  };
}

describe('Governance end-to-end flow', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a proposal, persists across reload, votes, updates results, and issues a receipt linking to the explorer', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { router, unmount } = renderGovernanceAt('/startup/governance/proposals/create');

    // Step 1: Title
    const titleInput = screen.getByRole('textbox');
    fireEvent.change(titleInput, { target: { value: 'Expand Developer Grants Program' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Abstract
    const abstractInput = screen.getByRole('textbox');
    fireEvent.change(abstractInput, {
      target: { value: 'Allocate 250,000 USDC to fund open-source Soroban tooling for Revora issuers.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Actions — switch to text_resolution so no account address lookup is required
    const actionTypeSelect = screen.getByRole('combobox');
    fireEvent.change(actionTypeSelect, { target: { value: 'text_resolution' } });
    const descInput = screen.getByRole('textbox');
    fireEvent.change(descInput, { target: { value: 'Approve Q4 developer grants budget.' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: Preview & Submit
    const submitBtn = screen.getByRole('button', { name: /submit proposal/i });
    fireEvent.click(submitBtn);

    // Should redirect to /startup/governance/proposals/:id and NOT call console.log
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/startup\/governance\/proposals\/prop-/);
    });
    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();

    const createdPath = router.state.location.pathname;
    expect(screen.getByRole('heading', { level: 1, name: 'Expand Developer Grants Program' })).toBeInTheDocument();
    expect(screen.getByText('Results Breakdown')).toBeInTheDocument();

    // Simulate page reload: unmount and remount at the proposals list
    unmount();
    const listRender = renderGovernanceAt('/startup/governance/proposals');
    expect(screen.getByRole('heading', { level: 1, name: /governance proposals/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Expand Developer Grants Program' })).toBeInTheDocument();
    listRender.unmount();

    // Simulate reload directly at the created proposal detail route
    const detailRender = renderGovernanceAt(createdPath);
    expect(screen.getByRole('heading', { level: 1, name: 'Expand Developer Grants Program' })).toBeInTheDocument();

    // Cast a "For" vote
    const voteForBtn = screen.getByRole('button', { name: /^for$/i });
    fireEvent.click(voteForBtn);

    // Vote receipt dialog opens with explorer link built from stellar explorer helper
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const explorerLink = screen.getByRole('link', { name: /block explorer/i });
    const href = explorerLink.getAttribute('href') ?? '';
    expect(href).toMatch(new RegExp(`^${EXPLORER_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/tx/[0-9a-f]{64}$`));

    // Close receipt and verify stored results updated
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.getByTestId('vote-cta-voted')).toHaveTextContent(/you voted for/i);
    expect(screen.getByText(/decided by a single voter/i)).toBeInTheDocument();

    // Verify localStorage has the proposal and vote persisted
    const stored = JSON.parse(localStorage.getItem(GOVERNANCE_PROPOSALS_STORAGE_KEY) || '[]');
    const savedProposal = stored.find((p: { title: string }) => p.title === 'Expand Developer Grants Program');
    expect(savedProposal).toBeDefined();
    expect(savedProposal.userVote).toBe('for');
    expect(savedProposal.results.for).toBeGreaterThan(0);
    expect(savedProposal.voteReceipt).toBeTruthy();

    // Re-open receipt button works
    fireEvent.click(screen.getByRole('button', { name: /view vote receipt/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    detailRender.unmount();
  });

  it('persists delegation selection on /startup/governance/delegation across reload', async () => {
    const firstRender = renderGovernanceAt('/startup/governance/delegation');

    const searchInput = screen.getByPlaceholderText('Search by name or address...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('Alice Voter'));

    fireEvent.click(screen.getByRole('button', { name: /delegate to alice voter/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delegate' }));

    await waitFor(() => {
      expect(localStorage.getItem(GOVERNANCE_DELEGATION_STORAGE_KEY)).toBe('del-1');
    });
    firstRender.unmount();

    // Reload delegation page and verify Alice is still delegated
    const secondRender = renderGovernanceAt('/startup/governance/delegation');
    expect(screen.getByRole('button', { name: /revoke delegation from alice voter/i })).toBeInTheDocument();
    secondRender.unmount();
  });

  it('shows a not-found state for unknown proposal IDs', () => {
    renderGovernanceAt('/startup/governance/proposals/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: /proposal not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to proposals/i })).toBeInTheDocument();
  });
});
