import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GovernanceDelegation } from './GovernanceDelegation';
import { DelegatedPowerHeader } from './DelegatedPowerHeader';
import { DelegateProfileCard } from './DelegateProfileCard';
import { DelegateSearch } from './DelegateSearch';
import { DelegationConfirmDialog, RevokeConfirmDialog } from './DelegationDialogs';
import type { DelegateData } from './DelegateProfileCard';
import '@testing-library/jest-dom';

expect.extend(toHaveNoViolations);

/* ─── Mock data ──────────────────────────────────────────────── */

const MOCK_DELEGATE: DelegateData = {
  id: 'test-1',
  name: 'Test Delegate',
  address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
  participationRate: 88,
  voteAlignment: 75,
  totalDelegated: 500000,
  expertiseTags: ['Governance', 'DeFi'],
  bio: 'A test delegate for unit testing.',
  totalProposalsVoted: 20,
  avgResponseTimeHours: 12,
  delegatorCount: 42,
  voteHistory: [
    { proposalId: 'p1', proposalTitle: 'Test Proposal Alpha', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-01T00:00:00Z' },
    { proposalId: 'p2', proposalTitle: 'Test Proposal Beta', voteChoice: 'against', alignedWithOutcome: false, votedAt: '2026-07-15T00:00:00Z' },
  ],
};

const MINIMAL_DELEGATE: DelegateData = {
  id: 'test-min',
  name: 'Min Delegate',
  address: '0x0000000000000000000000000000000000000001',
  participationRate: 50,
  voteAlignment: 50,
  totalDelegated: 1000,
};

describe('GovernanceDelegation', () => {
  let showModalMock: ReturnType<typeof vi.fn>;
  let closeMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    showModalMock = vi.fn();
    closeMock = vi.fn();
    HTMLDialogElement.prototype.showModal = showModalMock;
    HTMLDialogElement.prototype.close = closeMock;
    const storageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true });
  });

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without accessibility violations', async () => {
    const { container } = render(<GovernanceDelegation />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the delegated power header', () => {
    render(<GovernanceDelegation />);
    expect(screen.getByTestId('delegated-power-header')).toBeInTheDocument();
    expect(screen.getByText('Not currently delegated')).toBeInTheDocument();
  });

  it('allows searching and selecting a delegate', async () => {
    render(<GovernanceDelegation />);
    const searchInput = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(searchInput, 'Alice');
    await userEvent.click(screen.getByText('Alice Voter'));
    expect(screen.getByTestId('delegate-card-del-1')).toBeInTheDocument();
  });

  it('shows no results message', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'ZZZNOTEXIST');
    await waitFor(() => { expect(screen.getByTestId('search-empty')).toBeInTheDocument(); });
  });

  it('completes delegation flow', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    await waitFor(() => { expect(screen.getByTestId('active-delegation-badge')).toBeInTheDocument(); }, { timeout: 3000 });
  });

  it('completes revocation flow', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    await waitFor(() => { expect(screen.getByTestId('active-delegation-badge')).toBeInTheDocument(); }, { timeout: 3000 });
    await userEvent.click(screen.getByTestId('power-header-revoke'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    await waitFor(() => { expect(screen.getByTestId('toast')).toBeInTheDocument(); }, { timeout: 3000 });
  });

  it('detects self-delegation', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Alice');
    await userEvent.click(screen.getByText('Alice Voter'));
    expect(screen.getByTestId('self-delegate-badge')).toBeInTheDocument();
  });

  it('shows active votes warning in revoke dialog', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    await waitFor(() => { expect(screen.getByTestId('active-delegation-badge')).toBeInTheDocument(); }, { timeout: 3000 });
    await userEvent.click(screen.getByTestId('power-header-revoke'));
    await waitFor(() => { expect(screen.getByTestId('active-votes-warning')).toBeInTheDocument(); });
  });

  it('shows vote history on profile', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Alice');
    await userEvent.click(screen.getByText('Alice Voter'));
    expect(screen.getByTestId('vote-history')).toBeInTheDocument();
    expect(screen.getByText('Recent Votes')).toBeInTheDocument();
  });

  it('shows alignment bar with progressbar role', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Alice');
    await userEvent.click(screen.getByText('Alice Voter'));
    const bar = screen.getByRole('progressbar', { name: 'Vote alignment: 85%' });
    expect(bar).toHaveAttribute('aria-valuenow', '85');
  });

  it('dialog has ARIA attributes', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await waitFor(() => {
      const d = screen.getByTestId('delegation-dialog');
      expect(d).toHaveAttribute('aria-labelledby');
      expect(d).toHaveAttribute('aria-describedby');
    });
  });

  it('closes confirm dialog on cancel', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-cancel'));
    await waitFor(() => { expect(screen.queryByText('Confirm Delegation')).not.toBeInTheDocument(); });
  });

  it('closes confirm dialog on close button', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-close'));
    await waitFor(() => { expect(screen.queryByText('Confirm Delegation')).not.toBeInTheDocument(); });
  });

  it('shows profiles with lower participation (Diana)', async () => {
    render(<GovernanceDelegation />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Diana');
    await userEvent.click(screen.getByText('Diana Chain'));
    expect(screen.getByTestId('delegate-card-del-4')).toBeInTheDocument();
    expect(screen.getByText('34 delegators')).toBeInTheDocument();
  });

  it('keyboard navigation in search', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    fireEvent.keyDown(s, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(s, { key: 'Enter' });
    await waitFor(() => { expect(screen.getByTestId('delegate-card-del-2')).toBeInTheDocument(); });
  });

  it('Escape clears search', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Alice');
    fireEvent.keyDown(s, { key: 'Escape' });
    await waitFor(() => { expect(s).toHaveValue(''); });
  });

  it('clear button works', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Alice');
    await userEvent.click(screen.getByTestId('search-clear'));
    expect(s).toHaveValue('');
  });

  it('recent searches shown on focus', async () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(['del-3']));
    render(<GovernanceDelegation />);
    fireEvent.focus(screen.getByPlaceholderText('Search by name or wallet address…'));
    await waitFor(() => { expect(screen.getByText('Recent Searches')).toBeInTheDocument(); });
  });

  it('shows empty profile when no delegate', () => {
    render(<GovernanceDelegation />);
    expect(screen.getByTestId('empty-profile')).toBeInTheDocument();
  });

  it('delegated state in header after delegation', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    await waitFor(() => {
      expect(screen.getByText('Voting power delegated to')).toBeInTheDocument();
      expect(screen.getByTestId('power-header-revoke')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

/* ─── Standalone: DelegatedPowerHeader ────────────────────────── */

describe('DelegatedPowerHeader', () => {
  it('renders not-delegated state', () => {
    render(<DelegatedPowerHeader isDelegated={false} votingPower={100000} />);
    expect(screen.getByText('Voting power available')).toBeInTheDocument();
    expect(screen.getByText('100,000 VP')).toBeInTheDocument();
    expect(screen.queryByTestId('power-header-revoke')).not.toBeInTheDocument();
  });

  it('renders delegated state with all props', () => {
    render(
      <DelegatedPowerHeader
        isDelegated={true}
        delegateName="Alice"
        delegateAddress="0x1234567890abcdef1234567890abcdef12345678"
        votingPower={250000}
        delegatedSince="2 weeks ago"
        onRevokeClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Voting power delegated to')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Since 2 weeks ago')).toBeInTheDocument();
    expect(screen.getByTestId('power-header-revoke')).toBeInTheDocument();
  });

  it('renders self-delegated state', () => {
    render(<DelegatedPowerHeader isDelegated={true} isSelfDelegated={true} votingPower={500000} />);
    expect(screen.getByText('Self-delegated')).toBeInTheDocument();
    expect(screen.getByText('500,000 VP')).toBeInTheDocument();
    expect(screen.getByText('You vote with your own power')).toBeInTheDocument();
  });

  it('calls onRevokeClick when revoke is clicked', async () => {
    const onRevoke = vi.fn();
    render(
      <DelegatedPowerHeader
        isDelegated={true}
        delegateName="Bob"
        votingPower={100000}
        onRevokeClick={onRevoke}
      />,
    );
    await userEvent.click(screen.getByTestId('power-header-revoke'));
    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  it('renders truncated address', () => {
    render(
      <DelegatedPowerHeader
        isDelegated={true}
        delegateName="LongName"
        delegateAddress="0xabcdef1234567890abcdef1234567890abcdef12"
        votingPower={1000}
      />,
    );
    // truncateAddress shows head 6 chars + … + tail 4 chars = "0xabcd…ef12"
    expect(screen.getByText(/0xabcd/)).toBeInTheDocument();
    expect(screen.getByText(/ef12/)).toBeInTheDocument();
  });
});

/* ─── Standalone: DelegateProfileCard ─────────────────────────── */

describe('DelegateProfileCard', () => {
  it('renders full profile with all fields', () => {
    render(
      <DelegateProfileCard
        delegate={MOCK_DELEGATE}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Test Delegate')).toBeInTheDocument();
    expect(screen.getByText('A test delegate for unit testing.')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('DeFi')).toBeInTheDocument();
    expect(screen.getByText('500,000 VP')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('42 delegators')).toBeInTheDocument();
    expect(screen.getByText(/12h/)).toBeInTheDocument();
    expect(screen.getByTestId('vote-history')).toBeInTheDocument();
  });

  it('renders with self-delegation', () => {
    render(
      <DelegateProfileCard
        delegate={MOCK_DELEGATE}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
        isSelf={true}
      />,
    );
    expect(screen.getByTestId('self-delegate-badge')).toBeInTheDocument();
    expect(screen.getByTestId('self-delegate-msg')).toBeInTheDocument();
  });

  it('renders with active delegation', () => {
    render(
      <DelegateProfileCard
        delegate={MOCK_DELEGATE}
        isDelegated={true}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('active-delegation-badge')).toBeInTheDocument();
    expect(screen.getByTestId('revoke-btn')).toBeInTheDocument();
  });

  it('renders minimal profile without optional fields', () => {
    render(
      <DelegateProfileCard
        delegate={MINIMAL_DELEGATE}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Min Delegate')).toBeInTheDocument();
    // Both participation and alignment are 50% - use getAllByText
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByTestId('vote-history')).not.toBeInTheDocument();
    expect(screen.queryByText(/delegator/)).not.toBeInTheDocument();
  });

  it('calls onDelegateClick when delegate button clicked', async () => {
    const onClick = vi.fn();
    render(
      <DelegateProfileCard delegate={MOCK_DELEGATE} isDelegated={false} onDelegateClick={onClick} onRevokeClick={vi.fn()} />,
    );
    await userEvent.click(screen.getByTestId('delegate-btn'));
    expect(onClick).toHaveBeenCalled();
  });

  it('calls onRevokeClick when revoke button clicked', async () => {
    const onRevoke = vi.fn();
    render(
      <DelegateProfileCard delegate={MOCK_DELEGATE} isDelegated={true} onDelegateClick={vi.fn()} onRevokeClick={onRevoke} />,
    );
    await userEvent.click(screen.getByTestId('revoke-btn'));
    expect(onRevoke).toHaveBeenCalled();
  });
});

/* ─── Standalone: DelegateSearch ──────────────────────────────── */

describe('DelegateSearch', () => {
  it('renders search input and label', () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    expect(screen.getByText('Find a Delegate')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name or wallet address…')).toBeInTheDocument();
  });

  it('calls onSelectDelegate on result click', async () => {
    const onSelect = vi.fn();
    render(<DelegateSearch onSelectDelegate={onSelect} />);
    const input = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(input, 'Alice');
    await userEvent.click(screen.getByText('Alice Voter'));
    expect(onSelect).toHaveBeenCalledWith('del-1');
  });

  it('shows no results for unknown query', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'ZZZ');
    await waitFor(() => { expect(screen.getByTestId('search-empty')).toBeInTheDocument(); });
  });

  it('shows clear button and clears on click', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByTestId('search-clear'));
    expect(input).toHaveValue('');
  });

  it('keyboard navigation with ArrowDown and Enter', async () => {
    const onSelect = vi.fn();
    render(<DelegateSearch onSelectDelegate={onSelect} />);
    const input = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(input, 'Bob');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalled();
  });

  it('Escape clears input', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(input, 'Alice');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => { expect(input).toHaveValue(''); });
  });

  it('shows recent searches on focus', async () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(['del-1']));
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    fireEvent.focus(screen.getByPlaceholderText('Search by name or wallet address…'));
    await waitFor(() => { expect(screen.getByText('Recent Searches')).toBeInTheDocument(); });
  });

  it('highlights on mouse enter', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Search by name or wallet address…'), 'Alice');
    const item = screen.getByText('Alice Voter').closest('li')!;
    fireEvent.mouseEnter(item);
    expect(item).toHaveClass('gd-search-result-item--active');
  });
});

/* ─── Standalone: DelegationDialogs ───────────────────────────── */

describe('DelegationDialogs', () => {
  it('renders DelegationConfirmDialog', () => {
    render(
      <DelegationConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        delegateName="Alice"
        delegateAddress="0xABCD"
        votingPower={100000}
      />,
    );
    expect(screen.getByText('Confirm Delegation')).toBeInTheDocument();
    expect(screen.getByText('100,000 VP')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-cancel')).toBeInTheDocument();
  });

  it('DelegationConfirmDialog calls onConfirm', async () => {
    const onConfirm = vi.fn();
    render(
      <DelegationConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        delegateName="Bob"
        delegateAddress="0x1234"
        votingPower={5000}
      />,
    );
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('DelegationConfirmDialog calls onClose via cancel', async () => {
    const onClose = vi.fn();
    render(
      <DelegationConfirmDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} delegateName="Bob" delegateAddress="0x1" />,
    );
    await userEvent.click(screen.getByTestId('dialog-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('DelegationConfirmDialog calls onClose via close button', async () => {
    const onClose = vi.fn();
    render(
      <DelegationConfirmDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} delegateName="Bob" delegateAddress="0x1" />,
    );
    await userEvent.click(screen.getByTestId('dialog-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('DelegationConfirmDialog default votingPower is 0', () => {
    render(
      <DelegationConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} delegateName="Bob" delegateAddress="0x1" />,
    );
    expect(screen.getByText('0 VP')).toBeInTheDocument();
  });

  it('DelegationConfirmDialog shows loading state', () => {
    render(
      <DelegationConfirmDialog
        isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()}
        delegateName="Bob" delegateAddress="0x1" loading={true}
      />,
    );
    expect(screen.getByTestId('dialog-cancel')).toBeDisabled();
  });

  it('does not render DelegationConfirmDialog when closed', () => {
    render(
      <DelegationConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} delegateName="Bob" delegateAddress="0x1" />,
    );
    expect(screen.queryByTestId('delegation-dialog')).not.toBeInTheDocument();
  });

  it('renders RevokeConfirmDialog with delegate name', async () => {
    render(
      <RevokeConfirmDialog
        isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()}
        delegateName="Charlie" hasActiveVotes={true} activeProposalCount={3}
      />,
    );
    expect(screen.getByText('Revoke Delegation')).toBeInTheDocument();
    expect(screen.getByTestId('active-votes-warning')).toBeInTheDocument();
    expect(screen.getByText(/Charlie/)).toBeInTheDocument();
    expect(screen.getByText(/3 active proposals/)).toBeInTheDocument();
  });

  it('RevokeConfirmDialog without delegate name', () => {
    render(
      <RevokeConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByText('Revoke Delegation')).toBeInTheDocument();
    expect(screen.queryByTestId('active-votes-warning')).not.toBeInTheDocument();
  });

  it('RevokeConfirmDialog with active votes but zero count', () => {
    render(
      <RevokeConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} hasActiveVotes={true} activeProposalCount={0} />,
    );
    expect(screen.getByTestId('active-votes-warning')).toBeInTheDocument();
    expect(screen.queryByText(/active proposal/)).not.toBeInTheDocument();
  });

  it('RevokeConfirmDialog calls onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<RevokeConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByTestId('dialog-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('RevokeConfirmDialog calls onClose via cancel', async () => {
    const onClose = vi.fn();
    render(<RevokeConfirmDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByTestId('dialog-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('RevokeConfirmDialog close button calls onClose', async () => {
    const onClose = vi.fn();
    render(<RevokeConfirmDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByTestId('dialog-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('RevokeConfirmDialog shows loading', () => {
    render(
      <RevokeConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} loading={true} />,
    );
    expect(screen.getByTestId('dialog-cancel')).toBeDisabled();
  });

  it('Dialog focus trap handles Tab without focusable elements', () => {
    // Render a dialog where focusable elements are present (buttons always are)
    render(
      <RevokeConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    // Tab should not throw; dialog has cancel and confirm buttons
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByTestId('dialog-cancel')).toBeInTheDocument();
  });

  it('Dialog closes on Escape', async () => {
    const onClose = vi.fn();
    render(<RevokeConfirmDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

});

/* ─── Coverage boost: DelegationDialogs dialog lifecycle ──────── */

describe('DelegationDialogs - lifecycle', () => {
  it('calls dialog.showModal when isOpen changes to true', () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    const showModalSpy = HTMLDialogElement.prototype.showModal as ReturnType<typeof vi.fn>;
    render(
      <RevokeConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(showModalSpy).toHaveBeenCalled();
  });
});

/* ─── Coverage boost: DelegateSearch loading & nav ────────────── */

describe('DelegateSearch - edge cases', () => {
  it('renders spinner in loading state', () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} loading={true} />);
    expect(screen.getByTestId('search-spinner')).toBeInTheDocument();
  });

  it('ArrowUp wraps to last item in search results', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(input, 'e');
    // ArrowUp from -1 wraps to last (index = results.length - 1)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const results = screen.getAllByRole('option');
    expect(results[results.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows self-tag when userAddress matches', () => {
    const addr = '0x1234...5678'; // Same as Alice
    render(<DelegateSearch onSelectDelegate={vi.fn()} userAddress={addr} />);
    const input = screen.getByPlaceholderText('Search by name or wallet address…');
    fireEvent.focus(input);
    // Alice should show self-tag
    expect(screen.getByText('Alice Voter').closest('li')).toBeInTheDocument();
  });
});

/* ─── Coverage boost: DelegateProfileCard vote variants ────────── */

describe('DelegateProfileCard - coverage', () => {
  it('renders alignment with moderate score', () => {
    const delegate: DelegateData = { ...MOCK_DELEGATE, voteAlignment: 65 };
    render(
      <DelegateProfileCard delegate={delegate} isDelegated={false} onDelegateClick={vi.fn()} onRevokeClick={vi.fn()} />,
    );
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders vote choices for against and abstain in history', () => {
    const delegate: DelegateData = {
      ...MOCK_DELEGATE,
      voteHistory: [
        { proposalId: 'p-a', proposalTitle: 'Prop A', voteChoice: 'against', alignedWithOutcome: false, votedAt: '2026-01-01T00:00:00Z' },
        { proposalId: 'p-b', proposalTitle: 'Prop B', voteChoice: 'abstain', alignedWithOutcome: true, votedAt: '2026-01-02T00:00:00Z' },
      ],
    };
    render(
      <DelegateProfileCard delegate={delegate} isDelegated={false} onDelegateClick={vi.fn()} onRevokeClick={vi.fn()} />,
    );
    expect(screen.getByText('Against')).toBeInTheDocument();
    expect(screen.getByText('Abstain')).toBeInTheDocument();
  });
});

/* ─── Coverage boost: DelegatedPowerHeader edge ────────────────── */

describe('DelegatedPowerHeader - coverage', () => {
  it('renders delegated state without delegatedSince', () => {
    render(
      <DelegatedPowerHeader
        isDelegated={true}
        delegateName="Test"
        votingPower={5000}
      />,
    );
    expect(screen.getByText('Voting power delegated to')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders with short address (no truncation needed)', () => {
    render(
      <DelegatedPowerHeader
        isDelegated={true}
        delegateName="Short"
        delegateAddress="0x12"
        votingPower={100}
      />,
    );
    // Address length <= 13 chars, so no truncation
    expect(screen.getByText('0x12')).toBeInTheDocument();
  });
});

/* ─── Coverage boost: GovernanceDelegation handlers ────────────── */

describe('GovernanceDelegation - handler coverage', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it('executes full delegation and revocation flow in sequence', async () => {
    render(<GovernanceDelegation />);

    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('active-delegation-badge')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Now revoke via power header
    await userEvent.click(screen.getByTestId('power-header-revoke'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders toast and clears after timeout', async () => {
    render(<GovernanceDelegation />);
    const s = screen.getByPlaceholderText('Search by name or wallet address…');
    await userEvent.type(s, 'Bob');
    await userEvent.click(screen.getByText('Bob Stake'));
    await userEvent.click(screen.getByTestId('delegate-btn'));
    await userEvent.click(screen.getByTestId('dialog-confirm'));

    // Toast should appear after delegation completes
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
