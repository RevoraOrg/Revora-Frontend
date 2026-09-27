/**
 * GovernanceVoteReceipt/index.test.tsx — focused tests for the module's
 * public surface re-exported by `src/components/GovernanceVoteReceipt/index.ts`.
 *
 * The barrel exposes three things:
 *   1. `GovernanceVoteReceipt` — the dialog component (named + default)
 *   2. `GovernanceVoteReceiptProps` — the component's prop contract
 *   3. `VoteChoice` / `TxStatus` — the discriminated state unions
 *
 * These tests exercise the module boundary itself (imports resolve through the
 * index) plus representative success/failure behavior, invalid inputs, and the
 * primary txStatus transitions, so the public contract is guarded against
 * regression.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import {
  GovernanceVoteReceipt,
  type GovernanceVoteReceiptProps,
  type VoteChoice,
  type TxStatus,
} from './index';
// The underlying implementation module — used to prove the barrel forwards
// the component unchanged rather than wrapping or shadowing it.
import { GovernanceVoteReceipt as DirectGovernanceVoteReceipt } from './GovernanceVoteReceipt';

/* ─── Global stubs ──────────────────────────────────────────────── */

// jsdom does not implement the async Clipboard API; every copy interaction in
// the receipt relies on it, so provide a mock for the whole suite.
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

/* ─── Fixtures ──────────────────────────────────────────────────── */

const TX_HASH = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const VOTER = '0xabc123def456abc123def456abc123def456abc1';

const BASE_PROPS: GovernanceVoteReceiptProps = {
  isOpen: true,
  onClose: vi.fn(),
  proposalTitle: 'Increase Protocol Treasury Allocation by 15%',
  proposalId: 'prop-001',
  voteChoice: 'for',
  votedAt: '2026-07-28T14:15:00Z',
  voterAddress: VOTER,
  txHash: TX_HASH,
  txStatus: 'confirmed',
  currentConfirmations: 12,
  targetConfirmations: 12,
  explorerBaseUrl: 'https://stellar.expert/explorer/public/tx/',
  shareUrl: 'https://app.revora.io/governance/prop-001/receipt?voter=0xabc',
};

function renderReceipt(overrides: Partial<GovernanceVoteReceiptProps> = {}) {
  const onClose = vi.fn();
  const onRetry = vi.fn();
  const utils = render(
    <GovernanceVoteReceipt
      {...BASE_PROPS}
      onClose={onClose}
      onRetry={onRetry}
      {...overrides}
    />,
  );
  return { ...utils, onClose, onRetry };
}

/** Type-level assertions: the unions are closed sets. */
const VOTE_CHOICES: readonly VoteChoice[] = ['for', 'against', 'abstain'] as const;
const TX_STATUSES: readonly TxStatus[] = [
  'pending',
  'confirming',
  'confirmed',
  'failed',
] as const;

/* ─── Module contract ───────────────────────────────────────────── */

describe('Module contract (index barrel)', () => {
  it('exports the dialog component via the named export', () => {
    expect(GovernanceVoteReceipt).toBeDefined();
    expect(typeof GovernanceVoteReceipt).toBe('function');
  });

  it('exposes a displayName on the re-exported component', () => {
    expect(GovernanceVoteReceipt.displayName).toBe('GovernanceVoteReceipt');
  });

  it('forwards the underlying component unchanged (no wrapper/shadow)', () => {
    expect(GovernanceVoteReceipt).toBe(DirectGovernanceVoteReceipt);
  });

  it('keeps the txStatus union closed (4 states)', () => {
    expect(TX_STATUSES).toHaveLength(4);
    for (const status of TX_STATUSES) {
      renderReceipt({ txStatus: status });
      cleanup();
    }
  });

  it('keeps the voteChoice union closed (3 choices)', () => {
    expect(VOTE_CHOICES).toHaveLength(3);
    for (const choice of VOTE_CHOICES) {
      renderReceipt({ voteChoice: choice });
      expect(screen.getByLabelText(`Vote: ${choice.charAt(0).toUpperCase()}${choice.slice(1)}`))
        .toBeInTheDocument();
      cleanup();
    }
  });
});

/* ─── Success path (confirmed) ──────────────────────────────────── */

describe('Success path — confirmed', () => {
  it('renders the dialog with confirmed heading and badge', () => {
    renderReceipt({ txStatus: 'confirmed' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /vote confirmed on-chain/i })).toBeInTheDocument();
    expect(screen.getByTestId('onchain-badge-confirmed')).toBeInTheDocument();
  });

  it('shows the truncated tx hash with the full hash available via title', () => {
    renderReceipt();
    const hashEl = screen.getByTestId('tx-hash-display');
    expect(hashEl.textContent).toContain('…');
    expect(hashEl.title).toBe(TX_HASH);
  });

  it('links the tx to the explorer with safe external link attributes', () => {
    renderReceipt();
    const link = screen.getByTestId('explorer-link');
    expect(link).toHaveAttribute(
      'href',
      `${BASE_PROPS.explorerBaseUrl}${TX_HASH}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('copies the full tx hash and voter address to the clipboard', async () => {
    renderReceipt();
    await userEvent.click(screen.getByTestId('copy-transaction-hash'));
    await userEvent.click(screen.getByTestId('copy-voter-address'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(TX_HASH);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(VOTER);
  });
});

/* ─── State transitions ─────────────────────────────────────────── */

describe('Primary txStatus transitions', () => {
  it('pending → shows "Vote submitted" without a retry affordance', () => {
    renderReceipt({ txStatus: 'pending' });
    expect(screen.getByRole('heading', { name: /vote submitted/i })).toBeInTheDocument();
    expect(screen.queryByTestId('retry-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('onchain-badge-pending')).toBeInTheDocument();
  });

  it('confirming → badge reflects confirmation progress', () => {
    renderReceipt({ txStatus: 'confirming', currentConfirmations: 6, targetConfirmations: 12 });
    expect(screen.getByRole('heading', { name: /vote submitted/i })).toBeInTheDocument();
    expect(screen.getByTestId('onchain-badge-confirming')).toBeInTheDocument();
  });

  it('failed → error heading, alert, and retry callback fires', async () => {
    const { onRetry } = renderReceipt({ txStatus: 'failed' });
    expect(screen.getByRole('heading', { name: /transaction failed/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/transaction failed/i);
    await userEvent.click(screen.getByTestId('retry-btn'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

/* ─── Failure / invalid inputs ──────────────────────────────────── */

describe('Invalid and boundary inputs', () => {
  it('treats an unknown txStatus defensively without crashing (render-time)', () => {
    // The component maps only known statuses; an unexpected runtime value
    // still must not throw while rendering.
    expect(() =>
      render(
        <GovernanceVoteReceipt
          {...BASE_PROPS}
          txStatus={'does-not-exist' as unknown as TxStatus}
        />,
      ),
    ).not.toThrow();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = renderReceipt({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('omits the retry section when onRetry is missing on failure', () => {
    renderReceipt({ txStatus: 'failed', onRetry: undefined });
    expect(screen.queryByTestId('retry-btn')).not.toBeInTheDocument();
  });

  it('handles a malformed votedAt timestamp without crashing', () => {
    expect(() => renderReceipt({ votedAt: 'not-a-timestamp' })).not.toThrow();
  });

  it('falls back to the raw ISO string for an invalid timestamp', () => {
    renderReceipt({ votedAt: 'not-a-timestamp' });
    expect(screen.getByText('not-a-timestamp')).toBeInTheDocument();
  });

  it('does not truncate short hashes', () => {
    const shortHash = '0x1234';
    renderReceipt({ txHash: shortHash, explorerBaseUrl: 'https://explorer.test/tx/' });
    expect(screen.getByTestId('tx-hash-display').textContent).toBe(shortHash);
    expect(screen.getByTestId('explorer-link')).toHaveAttribute(
      'href',
      `https://explorer.test/tx/${shortHash}`,
    );
  });

  it('renders without a shareUrl (no share-link row)', async () => {
    renderReceipt({ shareUrl: undefined });
    await userEvent.click(screen.getByTestId('share-toggle'));
    expect(screen.queryByText(/share link/i)).not.toBeInTheDocument();
  });

  it('truncates very long proposal titles without crashing', () => {
    expect(() => renderReceipt({ proposalTitle: 'A'.repeat(200) })).not.toThrow();
  });

  it('uses default confirmations (0/12) when omitted in confirming state', () => {
    renderReceipt({
      txStatus: 'confirming',
      currentConfirmations: undefined,
      targetConfirmations: undefined,
    });
    expect(screen.getByTestId('onchain-badge-confirming')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/transaction confirming - 0 of 12 confirmations received/i),
    ).toBeInTheDocument();
  });

  it('handles an empty proposalId without crashing', () => {
    expect(() => renderReceipt({ proposalId: '' })).not.toThrow();
  });
});

/* ─── Dismissal / interaction contract ──────────────────────────── */

describe('Dismissal contract', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('closes via close button, Done button, backdrop, and Escape', async () => {
    const first = renderReceipt();
    await userEvent.click(screen.getByTestId('gvr-close'));
    expect(first.onClose).toHaveBeenCalledOnce();
    cleanup();

    const second = renderReceipt();
    await userEvent.click(screen.getByTestId('done-btn'));
    expect(second.onClose).toHaveBeenCalledOnce();
    cleanup();

    const third = renderReceipt();
    await userEvent.click(screen.getByTestId('gvr-overlay'));
    expect(third.onClose).toHaveBeenCalledOnce();
    cleanup();

    const fourth = renderReceipt();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fourth.onClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking inside the dialog card', async () => {
    const { onClose } = renderReceipt();
    await userEvent.click(screen.getByTestId('gvr-dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses the close button when opened', () => {
    renderReceipt();
    expect(document.activeElement).toBe(screen.getByTestId('gvr-close'));
  });

  it('restores focus to the previously focused element when closed', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<GovernanceVoteReceipt {...BASE_PROPS} isOpen />);
    rerender(<GovernanceVoteReceipt {...BASE_PROPS} isOpen={false} />);

    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });
});

/* ─── Share panel ───────────────────────────────────────────────── */

describe('Share panel', () => {
  it('expands, shows summary, and collapses (toggle lifecycle)', async () => {
    renderReceipt();
    const toggle = screen.getByTestId('share-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByTestId('share-panel')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('share-panel');
    expect(within(panel).getByText(/voted For/)).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByTestId('share-panel')).not.toBeInTheDocument();
  });

  it('copies the share link and plain-text summary', async () => {
    renderReceipt();
    await userEvent.click(screen.getByTestId('share-toggle'));
    await userEvent.click(screen.getByTestId('copy-share-link'));
    await userEvent.click(screen.getByTestId('copy-text-summary'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(BASE_PROPS.shareUrl);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(`I voted For on "${BASE_PROPS.proposalTitle}"`),
    );
  });
});

/* ─── Accessibility through the barrel ──────────────────────────── */

describe('Accessibility (axe) via barrel import', () => {
  it('confirmed state has no axe violations', async () => {
    const { container } = renderReceipt({ txStatus: 'confirmed' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('failed state has no axe violations', async () => {
    const { container } = renderReceipt({ txStatus: 'failed' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
