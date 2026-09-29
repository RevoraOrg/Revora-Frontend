/**
 * Focused behavior coverage for the `PayoutDrillDownPanel.types` contract.
 *
 * `PayoutDrillDownPanel.types.ts` is a type-only module, so its public contract
 * is only observable at runtime through the components that consume it. This
 * suite pins the runtime-visible behavior of every exported member:
 *
 *  - `PayoutStatus` — the four payout lifecycle states and the transitions a
 *    panel re-render must observe.
 *  - `RecipientStatus` — the three per-recipient settlement states.
 *  - `RecipientItem` — required fields, the optional display fields, and the
 *    address/name rendering branches.
 *  - Representative invalid inputs — out-of-contract status strings, empty
 *    recipient lists, and skewed numeric payloads — must render deterministically
 *    without throwing.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayoutDrillDownPanel } from './PayoutDrillDownPanel';
import type {
  PayoutDetail,
  PayoutStatus,
  RecipientItem,
  RecipientStatus,
} from './PayoutDrillDownPanel.types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRecipient(overrides: Partial<RecipientItem> = {}): RecipientItem {
  return {
    id: 'rec-1',
    walletAddress: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
    name: 'Apex Growth Fund',
    tier: 'Institutional',
    sharePercentage: 18.5,
    amount: 22456.68,
    status: 'success',
    gasAllocatedGwei: 24.5,
    ...overrides,
  };
}

function makePayout(overrides: Partial<PayoutDetail> = {}): PayoutDetail {
  return {
    id: 'PO-2026-004',
    payoutNumber: 'Payout #PO-2026-004',
    date: 'Jul 24, 2026',
    time: '14:32:00 UTC',
    status: 'completed',
    grossAmount: 124500,
    netAmount: 121387.5,
    protocolFeeUsd: 3112.5,
    currency: 'USD',
    offeringName: 'Nexus Cloud Series A',
    offeringId: 'OFF-NX-001',
    gasFeeUsd: 42.15,
    gasFeeEth: 0.0125,
    gasPriceGwei: 24.5,
    estimatedGasUsd: 45,
    estimatedGasPriceGwei: 26,
    executionNetwork: 'Ethereum Mainnet',
    blockNumber: 20485912,
    contractAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    transactionHash: '0x3a91b8d8f92147e8c1b3f94017e849204b1239840291487214981d2938174092',
    recipientsCount: 1,
    recipients: [makeRecipient()],
    retries: [],
    ...overrides,
  };
}

const ALL_PAYOUT_STATUSES: PayoutStatus[] = ['completed', 'processing', 'failed', 'scheduled'];
const ALL_RECIPIENT_STATUSES: RecipientStatus[] = ['success', 'pending', 'failed'];

function renderPanel(payoutData: PayoutDetail, props: Record<string, unknown> = {}) {
  return render(
    <PayoutDrillDownPanel
      isOpen
      payoutId={payoutData.id}
      payoutData={payoutData}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
});

// ─── PayoutStatus ────────────────────────────────────────────────────────────

describe('PayoutStatus contract', () => {
  it.each(ALL_PAYOUT_STATUSES)('renders the "%s" state verbatim in the status badge', (status) => {
    renderPanel(makePayout({ status }));

    const badge = screen.getByTestId('payout-status-badge');
    expect(badge).toHaveTextContent(status);
    expect(badge.className).toContain(`payout-status-badge--${status}`);
  });

  it('only exposes the retry-batch action for the failed state', () => {
    ALL_PAYOUT_STATUSES.forEach((status) => {
      const { unmount } = renderPanel(makePayout({ status }));
      fireEvent.click(screen.getByRole('tab', { name: /retry history/i }));

      if (status === 'failed') {
        expect(screen.getByTestId('payout-retry-batch-btn')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('payout-retry-batch-btn')).not.toBeInTheDocument();
      }
      unmount();
    });
  });

  it('observes the processing -> completed state transition on re-render', () => {
    const { rerender } = renderPanel(makePayout({ status: 'processing' }));
    expect(screen.getByTestId('payout-status-badge')).toHaveTextContent('processing');

    rerender(
      <PayoutDrillDownPanel
        isOpen
        payoutId="PO-2026-004"
        payoutData={makePayout({ status: 'completed' })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('payout-status-badge')).toHaveTextContent('completed');
    expect(screen.getByTestId('payout-status-badge').className).toContain(
      'payout-status-badge--completed',
    );
  });

  it('observes the failed -> completed recovery transition', () => {
    const { rerender } = renderPanel(makePayout({ status: 'failed' }));
    fireEvent.click(screen.getByRole('tab', { name: /retry history/i }));
    expect(screen.getByTestId('payout-retry-batch-btn')).toBeInTheDocument();

    rerender(
      <PayoutDrillDownPanel
        isOpen
        payoutId="PO-2026-004"
        payoutData={makePayout({ status: 'completed' })}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /retry history/i }));

    expect(screen.getByTestId('payout-status-badge')).toHaveTextContent('completed');
    expect(screen.queryByTestId('payout-retry-batch-btn')).not.toBeInTheDocument();
  });

  it('renders an out-of-contract status deterministically instead of throwing', () => {
    const rogue = 'reverted' as PayoutStatus;
    renderPanel(makePayout({ status: rogue }));

    const badge = screen.getByTestId('payout-status-badge');
    expect(badge).toHaveTextContent('reverted');
    expect(badge.className).toContain('payout-status-badge--reverted');
  });
});

// ─── RecipientStatus ─────────────────────────────────────────────────────────

describe('RecipientStatus contract', () => {
  it.each(ALL_RECIPIENT_STATUSES)('renders a "%s" recipient badge with its modifier class', (status) => {
    renderPanel(
      makePayout({ recipients: [makeRecipient({ status })], recipientsCount: 1 }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    const card = screen.getByTestId('payout-recipient-list');
    const badge = card.querySelector(`.payout-status-badge--${status}`);
    expect(badge).not.toBeNull();
    expect(badge).toHaveTextContent(status);
  });

  it('renders mixed recipient statuses side by side without collapsing them', () => {
    renderPanel(
      makePayout({
        recipientsCount: 3,
        recipients: [
          makeRecipient({ id: 'r1', status: 'success' }),
          makeRecipient({ id: 'r2', status: 'pending', name: 'Vanguard' }),
          makeRecipient({ id: 'r3', status: 'failed', name: 'Northwind' }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });
});

// ─── RecipientItem ───────────────────────────────────────────────────────────

describe('RecipientItem contract', () => {
  it('renders the name-then-truncated-address branch when a name is present', () => {
    renderPanel(
      makePayout({
        recipients: [
          makeRecipient({
            name: 'Apex Growth Fund',
            walletAddress: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
          }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText('Apex Growth Fund (0x9522...Afe5)')).toBeInTheDocument();
  });

  it('renders the address-only branch when the optional name is omitted', () => {
    renderPanel(
      makePayout({
        recipients: [
          makeRecipient({
            name: undefined,
            walletAddress: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
          }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText('0x952222...4BAfe5')).toBeInTheDocument();
  });

  it('renders the tier, share percentage and allocated gas for every recipient', () => {
    renderPanel(
      makePayout({
        recipients: [
          makeRecipient({
            tier: 'Series A Lead',
            sharePercentage: 12,
            gasAllocatedGwei: 24.5,
          }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText('Series A Lead')).toBeInTheDocument();
    expect(screen.getByText('• Share: 12%')).toBeInTheDocument();
    expect(screen.getByText('• Gas: 24.5 Gwei')).toBeInTheDocument();
  });

  it('keeps the empty-name fallback stable as the address boundary values change', () => {
    renderPanel(
      makePayout({
        recipients: [
          makeRecipient({ id: 'short', name: undefined, walletAddress: '0xABCDEFGH' }),
          makeRecipient({ id: 'long', name: undefined, walletAddress: '0x' + 'a'.repeat(60) }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    // Slicing a short address still yields a deterministic, non-empty label.
    expect(screen.getByText('0xABCDEF...CDEFGH')).toBeInTheDocument();
  });

  it('renders skewed numeric payloads without throwing', () => {
    renderPanel(
      makePayout({
        recipients: [
          makeRecipient({
            id: 'neg',
            name: undefined,
            sharePercentage: -12.5,
            amount: -1000,
            gasAllocatedGwei: -1,
          }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText('• Share: -12.5%')).toBeInTheDocument();
    expect(screen.getByTestId('payout-recipient-list')).toBeInTheDocument();
  });
});

// ─── Boundary / invalid payloads ─────────────────────────────────────────────

describe('representative invalid inputs', () => {
  it('shows the empty-search state rather than crashing on an empty recipient list', () => {
    renderPanel(makePayout({ recipients: [], recipientsCount: 0 }));
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText(/No recipients found matching/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payout-recipient-list')).not.toBeInTheDocument();
  });

  it('falls back to the empty recipients view when recipientsCount disagrees with the list', () => {
    renderPanel(makePayout({ recipientsCount: 99, recipients: [] }));
    fireEvent.click(screen.getByRole('tab', { name: /recipients/i }));

    expect(screen.getByText(/No recipients found matching/i)).toBeInTheDocument();
  });

  it('keeps a dangling optional gas price out of the required shape', () => {
    const data = makePayout();
    // `nextPayoutEstimateUsd` and `nextPayoutLink` are deliberately optional.
    expect(data.nextPayoutEstimateUsd).toBeUndefined();
    renderPanel(data);
    expect(screen.getByTestId('payout-panel')).toBeInTheDocument();
  });
});
