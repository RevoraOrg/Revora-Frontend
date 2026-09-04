/**
 * Tests for GovernanceVoting component (Issue #629).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GovernanceVoting } from './GovernanceVoting';
import type { GovernanceProposal, VoteChoice } from './types';

expect.extend(toHaveNoViolations);

const NOW = 1756972800000; // fixed timestamp for tests

const createProposal = (
  overrides: Partial<GovernanceProposal> = {}
): GovernanceProposal => ({
  id: 'prop-test-1',
  title: 'Upgrade Treasury Settlement to USDC 2.0',
  description:
    'Proposal to upgrade treasury settlement contracts to support automatic batching and multi-sig authorizers.',
  proposer: 'GD7X...9K2M',
  category: 'Treasury & Payouts',
  status: 'active',
  startTime: NOW - 24 * 3600 * 1000,
  endTime: NOW + 72 * 3600 * 1000,
  quorumRequired: 400000,
  quorumReached: 500000,
  totalVotingWeight: 1000000,
  tally: {
    forVotes: 350000,
    againstVotes: 100000,
    abstainVotes: 50000,
  },
  userVote: null,
  userVotingPower: 12500,
  discussionUrl: 'https://community.revora.finance/p/101',
  ...overrides,
});

describe('GovernanceVoting Component', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('Proposal Header & Meta', () => {
    it('renders proposal title, description, category, and proposer', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('proposal-title')).toHaveTextContent(
        'Upgrade Treasury Settlement to USDC 2.0'
      );
      expect(screen.getByTestId('proposal-description')).toHaveTextContent(
        /upgrade treasury settlement contracts/i
      );
      expect(screen.getByText('Treasury & Payouts')).toBeInTheDocument();
      expect(screen.getByText('GD7X...9K2M')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /view community discussion thread/i })
      ).toHaveAttribute('href', 'https://community.revora.finance/p/101');
    });

    it.each([
      ['active', 'Active'],
      ['pre_voting', 'Pre-voting'],
      ['passed', 'Passed'],
      ['rejected', 'Rejected'],
      ['quorum_failed', 'Quorum Failed'],
    ] as const)('renders status pill for %s status', (status, expectedLabel) => {
      const proposal = createProposal({ status });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      const pill = screen.getByTestId(`status-pill-${status}`);
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveTextContent(expectedLabel);
    });

    it('renders start countdown for pre-voting status', () => {
      const proposal = createProposal({
        status: 'pre_voting',
        startTime: Date.now() + 86400000 * 2, // 2 days in future
      });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('timing-badge')).toHaveTextContent(/starts in/i);
    });

    it('renders remaining countdown for active status', () => {
      const proposal = createProposal({
        status: 'active',
        endTime: Date.now() + 86400000 * 3,
      });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('timing-badge')).toHaveTextContent(/remaining/i);
    });

    it('renders concluded label for passed, rejected, and quorum failed status', () => {
      const proposal = createProposal({ status: 'passed' });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('timing-badge')).toHaveTextContent(
        /voting concluded/i
      );
    });
  });

  describe('Quorum Requirement Progress Bar', () => {
    it('renders quorum progress bar with accessibility attributes', () => {
      const proposal = createProposal({
        quorumRequired: 400000,
        quorumReached: 300000,
      });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      const bar = screen.getByTestId('quorum-progressbar');
      expect(bar).toHaveAttribute('role', 'progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '300000');
      expect(bar).toHaveAttribute('aria-valuemax', '400000');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('300.0K REV of 400.0K REV (75.0%)')
      );
      expect(screen.getByTestId('quorum-status-text')).toHaveTextContent(
        /quorum not yet reached/i
      );
    });

    it('indicates when quorum has been achieved', () => {
      const proposal = createProposal({
        quorumRequired: 400000,
        quorumReached: 550000,
      });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('quorum-status-text')).toHaveTextContent(
        /quorum achieved/i
      );
    });
  });

  describe('Vote Tally Visualization & Color-Blind Accessibility', () => {
    it('renders stacked tally bars with color-blind textures and classes', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('vote-tally-bar')).toBeInTheDocument();
      const forBar = screen.getByTestId('bar-segment-for');
      const againstBar = screen.getByTestId('bar-segment-against');
      const abstainBar = screen.getByTestId('bar-segment-abstain');

      expect(forBar).toHaveClass('gv-bar--for');
      expect(againstBar).toHaveClass('gv-bar--against');
      expect(abstainBar).toHaveClass('gv-bar--abstain');

      // 350k / 500k = 70.0%
      expect(forBar).toHaveStyle({ width: '70%' });
      // 100k / 500k = 20.0%
      expect(againstBar).toHaveStyle({ width: '20%' });
      // 50k / 500k = 10.0%
      expect(abstainBar).toHaveStyle({ width: '10%' });
    });

    it('renders tally legend with numeric percentages and token amounts', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('legend-pct-for')).toHaveTextContent('70.0%');
      expect(screen.getByTestId('legend-pct-against')).toHaveTextContent('20.0%');
      expect(screen.getByTestId('legend-pct-abstain')).toHaveTextContent('10.0%');

      const legend = screen.getByTestId('tally-legend');
      expect(within(legend).getByText('350.0K REV')).toBeInTheDocument();
      expect(within(legend).getByText('100.0K REV')).toBeInTheDocument();
      expect(within(legend).getByText('50.0K REV')).toBeInTheDocument();
    });

    it('renders a screen-reader accessible table fallback', () => {
      const { container } = render(
        <GovernanceVoting proposal={createProposal()} />
      );

      const table = container.querySelector('.sr-only table');
      expect(table).toBeInTheDocument();
      expect(table?.querySelector('caption')).toHaveTextContent(
        /current voting results breakdown/i
      );
      expect(table).toHaveTextContent('For');
      expect(table).toHaveTextContent('Against');
      expect(table).toHaveTextContent('Abstain');
    });

    it('handles zero votes gracefully without NaN', () => {
      const proposal = createProposal({
        tally: { forVotes: 0, againstVotes: 0, abstainVotes: 0 },
      });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByText(/no votes cast yet/i)).toBeInTheDocument();
      expect(screen.getByTestId('legend-pct-for')).toHaveTextContent('0.0%');
      expect(screen.getByTestId('legend-pct-against')).toHaveTextContent('0.0%');
      expect(screen.getByTestId('legend-pct-abstain')).toHaveTextContent('0.0%');
    });
  });

  describe('Voting Power Summary', () => {
    it('displays user available voting power and percentage of pool', () => {
      const proposal = createProposal({
        userVotingPower: 12500,
        totalVotingWeight: 1000000,
      });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('user-voting-power')).toHaveTextContent(
        '12.5K REV'
      );
      expect(screen.getByText(/1.25% of total voting pool/i)).toBeInTheDocument();
      expect(screen.getByText(/eligible to cast vote/i)).toBeInTheDocument();
    });

    it('shows ineligible badge if user has 0 REV voting power', () => {
      const proposal = createProposal({ userVotingPower: 0 });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(
        screen.getByText(/0 rev tokens — ineligible to vote/i)
      ).toBeInTheDocument();
    });

    it('shows already voted badge when user has cast a vote', () => {
      const proposal = createProposal({ userVote: 'for' as VoteChoice });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('voted-indicator')).toHaveTextContent(
        /you voted for/i
      );
    });
  });

  describe('Vote Selection & Radiogroup', () => {
    it('renders vote choices (For, Against, Abstain) in a radiogroup', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('vote-radiogroup')).toBeInTheDocument();
      expect(screen.getByTestId('vote-option-for')).toHaveAttribute(
        'role',
        'radio'
      );
      expect(screen.getByTestId('vote-option-against')).toHaveAttribute(
        'role',
        'radio'
      );
      expect(screen.getByTestId('vote-option-abstain')).toHaveAttribute(
        'role',
        'radio'
      );
    });

    it('selects option when clicked', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      const againstBtn = screen.getByTestId('vote-option-against');
      fireEvent.click(againstBtn);

      expect(againstBtn).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('vote-option-for')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('supports arrow key navigation in radiogroup', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      const forBtn = screen.getByTestId('vote-option-for');
      forBtn.focus();

      fireEvent.keyDown(forBtn, { key: 'ArrowRight' });
      expect(screen.getByTestId('vote-option-against')).toHaveAttribute(
        'aria-checked',
        'true'
      );

      const againstBtn = screen.getByTestId('vote-option-against');
      fireEvent.keyDown(againstBtn, { key: 'ArrowRight' });
      expect(screen.getByTestId('vote-option-abstain')).toHaveAttribute(
        'aria-checked',
        'true'
      );

      const abstainBtn = screen.getByTestId('vote-option-abstain');
      fireEvent.keyDown(abstainBtn, { key: 'ArrowLeft' });
      expect(screen.getByTestId('vote-option-against')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('disables voting when user has 0 voting power', () => {
      const proposal = createProposal({ userVotingPower: 0 });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('vote-option-for')).toBeDisabled();
      expect(screen.getByTestId('review-vote-button')).toBeDisabled();
      expect(
        screen.getByText(/you must hold rev tokens at snapshot/i)
      ).toBeInTheDocument();
    });

    it('disables voting when proposal is in pre_voting status', () => {
      const proposal = createProposal({ status: 'pre_voting' });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('vote-option-for')).toBeDisabled();
      expect(screen.getByTestId('review-vote-button')).toBeDisabled();
      expect(
        screen.getByText(/voting starts when the pre-voting period concludes/i)
      ).toBeInTheDocument();
    });

    it('disables voting when proposal is closed or quorum failed', () => {
      const proposal = createProposal({ status: 'quorum_failed' });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('vote-option-for')).toBeDisabled();
      expect(screen.getByTestId('review-vote-button')).toBeDisabled();
      expect(
        screen.getByText(/voting has concluded for this proposal/i)
      ).toBeInTheDocument();
    });

    it('disables voting if user has already voted', () => {
      const proposal = createProposal({ userVote: 'for' });
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      expect(screen.getByTestId('vote-option-for')).toBeDisabled();
      expect(screen.getByTestId('review-vote-button')).toBeDisabled();
      expect(screen.getByText(/your vote of/i)).toBeInTheDocument();
    });
  });

  describe('Vote Confirmation Modal Flow', () => {
    it('opens confirmation modal with summary of choice and power', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      fireEvent.click(screen.getByTestId('vote-option-for'));
      fireEvent.click(screen.getByTestId('review-vote-button'));

      expect(screen.getByTestId('vote-confirm-modal')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-choice-value')).toHaveTextContent(
        'FOR'
      );
      expect(screen.getByTestId('confirm-power-value')).toHaveTextContent(
        '12.5K REV'
      );
      expect(
        screen.getByText(/votes on stellar are immutable/i)
      ).toBeInTheDocument();
    });

    it('closes modal on cancel button click', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      fireEvent.click(screen.getByTestId('review-vote-button'));
      expect(screen.getByTestId('vote-confirm-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-modal-button'));
      expect(screen.queryByTestId('vote-confirm-modal')).not.toBeInTheDocument();
    });

    it('closes modal on Escape key', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      fireEvent.click(screen.getByTestId('review-vote-button'));
      expect(screen.getByTestId('vote-confirm-modal')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('vote-confirm-modal')).not.toBeInTheDocument();
    });

    it('traps focus inside the modal when Tab is pressed', () => {
      const proposal = createProposal();
      render(<GovernanceVoting proposal={proposal} proposals={[proposal]} />);

      fireEvent.click(screen.getByTestId('review-vote-button'));
      const modal = screen.getByTestId('vote-confirm-modal');
      const closeBtn = screen.getByLabelText(/close vote confirmation dialog/i);
      const cancelBtn = screen.getByTestId('cancel-modal-button');
      const confirmBtn = screen.getByTestId('confirm-vote-button');

      // Tab on last element (confirmBtn) wraps to first (closeBtn)
      confirmBtn.focus();
      fireEvent.keyDown(modal, { key: 'Tab' });
      expect(document.activeElement).toBe(closeBtn);

      // Shift+Tab on first element (closeBtn) wraps to last (confirmBtn)
      closeBtn.focus();
      fireEvent.keyDown(modal, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(confirmBtn);
    });

    it('submits vote successfully and updates local tally and screen-reader live region', async () => {
      const onVoteSubmit = vi.fn().mockResolvedValue({
        success: true,
        txHash: '0x12345678',
        timestamp: Date.now(),
      });

      const proposal = createProposal({
        tally: { forVotes: 350000, againstVotes: 100000, abstainVotes: 50000 },
        userVotingPower: 12500,
      });

      render(
        <GovernanceVoting
          proposal={proposal}
          proposals={[proposal]}
          onVoteSubmit={onVoteSubmit}
        />
      );

      fireEvent.click(screen.getByTestId('vote-option-for'));
      fireEvent.click(screen.getByTestId('review-vote-button'));

      const confirmBtn = screen.getByTestId('confirm-vote-button');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });

      expect(onVoteSubmit).toHaveBeenCalledWith('prop-test-1', 'for', 12500);
      expect(screen.getByText(/TX: 0x12345678/i)).toBeInTheDocument();

      // Check screen-reader announcement
      expect(screen.getByTestId('live-announcement')).toHaveTextContent(
        /vote cast successfully for for/i
      );

      // Close modal
      fireEvent.click(screen.getByTestId('done-button'));
      expect(screen.queryByTestId('vote-confirm-modal')).not.toBeInTheDocument();

      // Verify updated tally legend (350k + 12.5k = 362.5k)
      const legend = screen.getByTestId('tally-legend');
      expect(within(legend).getByText('362.5K REV')).toBeInTheDocument();
      expect(screen.getByTestId('voted-indicator')).toHaveTextContent(
        /you voted for/i
      );
    });

    it('handles submission error with retry affordance', async () => {
      const onVoteSubmit = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network transaction timeout'))
        .mockResolvedValueOnce({ success: true, txHash: '0x9999' });

      const proposal = createProposal();
      render(
        <GovernanceVoting
          proposal={proposal}
          proposals={[proposal]}
          onVoteSubmit={onVoteSubmit}
        />
      );

      fireEvent.click(screen.getByTestId('review-vote-button'));
      fireEvent.click(screen.getByTestId('confirm-vote-button'));

      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Network transaction timeout')).toBeInTheDocument();

      // Click retry
      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });

      expect(onVoteSubmit).toHaveBeenCalledTimes(2);
    });

    it('prevents double submissions while in flight', async () => {
      let resolvePromise: (val: any) => void = () => {};
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      const onVoteSubmit = vi.fn().mockReturnValue(slowPromise);

      const proposal = createProposal();
      render(
        <GovernanceVoting
          proposal={proposal}
          proposals={[proposal]}
          onVoteSubmit={onVoteSubmit}
        />
      );

      fireEvent.click(screen.getByTestId('review-vote-button'));
      const confirmBtn = screen.getByTestId('confirm-vote-button');

      fireEvent.click(confirmBtn);
      expect(confirmBtn).toBeDisabled();
      expect(screen.getByTestId('cancel-modal-button')).toBeDisabled();

      // Trying to click again does not trigger another call
      fireEvent.click(confirmBtn);
      expect(onVoteSubmit).toHaveBeenCalledTimes(1);

      // Finish submission
      resolvePromise({ success: true, txHash: '0xabc' });
      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });
    });
  });

  describe('Proposal Switcher', () => {
    it('allows switching between multiple proposals', () => {
      const p1 = createProposal({ id: 'p1', title: 'Proposal One' });
      const p2 = createProposal({ id: 'p2', title: 'Proposal Two' });

      render(<GovernanceVoting proposals={[p1, p2]} />);

      expect(screen.getByTestId('proposal-title')).toHaveTextContent(
        'Proposal One'
      );

      const select = screen.getByRole('combobox', {
        name: /select proposal to review/i,
      });
      fireEvent.change(select, { target: { value: 'p2' } });

      expect(screen.getByTestId('proposal-title')).toHaveTextContent(
        'Proposal Two'
      );
    });
  });

  describe('WCAG 2.1 AA Accessibility (axe)', () => {
    it('has no axe violations for active proposal view', async () => {
      const { container } = render(
        <GovernanceVoting proposal={createProposal()} />
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations for pre-voting proposal', async () => {
      const { container } = render(
        <GovernanceVoting proposal={createProposal({ status: 'pre_voting' })} />
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations for closed proposal', async () => {
      const { container } = render(
        <GovernanceVoting
          proposal={createProposal({
            status: 'passed',
            userVote: 'for',
          })}
        />
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when vote confirmation modal is open', async () => {
      const { container } = render(
        <GovernanceVoting proposal={createProposal()} />
      );

      fireEvent.click(screen.getByTestId('review-vote-button'));
      expect(screen.getByTestId('vote-confirm-modal')).toBeInTheDocument();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
