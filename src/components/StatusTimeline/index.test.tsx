/**
 * Focused behaviour coverage for the StatusTimeline public barrel
 * (`src/components/StatusTimeline/index.ts`).
 *
 * The barrel is a production module with its own contract: it decides which
 * components and formatting helpers are reachable from `'./components/StatusTimeline'`
 * and which internals stay private. These tests pin that contract so a silent
 * re-point (shadowing a re-export, dropping a helper, or leaking an internal
 * module) fails loudly instead of surfacing as a downstream regression.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import * as barrel from './index';
import * as statusTimelineModule from './StatusTimeline';
import * as onChainStatusBadgeModule from './OnChainStatusBadge';
import * as onchainRejectionCardModule from './OnchainRejectionCard';
import * as transactionReceiptShareModule from './TransactionReceiptShare';
import * as onChainMetadataUtilsModule from './onChainMetadataUtils';

import type { Milestone } from './index';

function stubMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('StatusTimeline barrel (src/components/StatusTimeline/index.ts)', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── Export surface ─────────────────────────────────────────── */

  it('exposes exactly the documented runtime surface and nothing else', () => {
    expect(Object.keys(barrel).sort()).toEqual(
      [
        'OnChainStatusBadge',
        'OnchainRejectionCard',
        'StatusTimeline',
        'TransactionReceiptShare',
        'buildStellarExplorerTxUrl',
        'formatBlockNumber',
        'formatConfirmations',
        'formatTimeSince',
        'resolveExplorerUrl',
        'truncateHash',
      ].sort(),
    );
  });

  it('has no default export — the barrel is a pure named re-export module', () => {
    expect(barrel).not.toHaveProperty('default');
  });

  it('keeps sibling internals out of the public surface', () => {
    for (const internal of [
      'getRevenueReportMilestones',
      'getOfferingRegistrationMilestones',
      'getKycVerificationMilestones',
      'getOnchainRejectionMilestones',
      'getOnchainRejectionCopy',
      'ONCHAIN_REJECTION_COPY',
    ]) {
      expect(barrel).not.toHaveProperty(internal);
    }
  });

  /* ── Re-export identity (catches shadowing / re-implementation) ── */

  it('re-exports the component family by identity, not by copy', () => {
    expect(barrel.StatusTimeline).toBe(statusTimelineModule.StatusTimeline);
    expect(barrel.OnChainStatusBadge).toBe(onChainStatusBadgeModule.OnChainStatusBadge);
    expect(barrel.OnchainRejectionCard).toBe(
      onchainRejectionCardModule.OnchainRejectionCard,
    );
    expect(barrel.TransactionReceiptShare).toBe(
      transactionReceiptShareModule.TransactionReceiptShare,
    );
  });

  it('re-exports every on-chain formatting helper by identity', () => {
    expect(barrel.truncateHash).toBe(onChainMetadataUtilsModule.truncateHash);
    expect(barrel.formatBlockNumber).toBe(onChainMetadataUtilsModule.formatBlockNumber);
    expect(barrel.formatConfirmations).toBe(
      onChainMetadataUtilsModule.formatConfirmations,
    );
    expect(barrel.formatTimeSince).toBe(onChainMetadataUtilsModule.formatTimeSince);
    expect(barrel.buildStellarExplorerTxUrl).toBe(
      onChainMetadataUtilsModule.buildStellarExplorerTxUrl,
    );
    expect(barrel.resolveExplorerUrl).toBe(onChainMetadataUtilsModule.resolveExplorerUrl);
  });

  /* ── The barrel is actually usable ──────────────────────────── */

  it('renders a StatusTimeline imported through the barrel', () => {
    const milestones: Milestone[] = [
      { id: 'a', label: 'Draft', description: 'Prepare figures', status: 'completed' },
      { id: 'b', label: 'Submitted', status: 'in-progress' },
    ];

    render(<barrel.StatusTimeline milestones={milestones} />);

    expect(
      screen.getByRole('navigation', { name: 'Status timeline' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('renders OnchainRejectionCard through the barrel and falls back to the unknown reason copy', () => {
    render(<barrel.OnchainRejectionCard reason="not-a-real-reason" />);

    const card = screen.getByTestId('onchain-rejection-card');
    expect(card).toHaveAttribute('role', 'alert');
    expect(card).toHaveTextContent('Transaction pause — safe retry available');
  });

  it('renders OnChainStatusBadge through the barrel with placeholder metadata', () => {
    render(<barrel.OnChainStatusBadge metadata={{}} />);

    expect(screen.getByTestId('onchain-status-badge')).toBeInTheDocument();
    expect(screen.getByText('Explorer link unavailable')).toBeInTheDocument();
  });

  it('renders TransactionReceiptShare through the barrel', () => {
    render(
      <barrel.TransactionReceiptShare
        transactionId="tx-123"
        date="2026-07-27"
        amount={100}
        currency="USDC"
        status="completed"
        senderWallet="GSENDER"
        recipientWallet="GRECIPIENT"
      />,
    );

    expect(screen.getByText('tx-123')).toBeInTheDocument();
    expect(screen.getByText('100 USDC')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  /* ── Boundary behaviour of the re-exported helpers ──────────── */

  describe('truncateHash boundaries', () => {
    it('returns an empty string for empty and whitespace-only input', () => {
      expect(barrel.truncateHash('')).toBe('');
      expect(barrel.truncateHash('   ')).toBe('');
    });

    it('leaves short hashes untouched and elides long ones in the middle', () => {
      expect(barrel.truncateHash('abc')).toBe('abc');
      expect(barrel.truncateHash('abc', 2, 2)).toBe('abc');
      expect(barrel.truncateHash('abcdefghij', 2, 2)).toBe('ab…ij');
    });

    it('treats the exact head+tail+1 length as short enough to keep whole', () => {
      // 2 + 2 + 1 === 5 characters
      expect(barrel.truncateHash('abcde', 2, 2)).toBe('abcde');
      expect(barrel.truncateHash('abcdef', 2, 2)).toBe('ab…ef');
    });
  });

  describe('formatBlockNumber boundaries', () => {
    it('returns the em-dash placeholder for missing or blank input', () => {
      expect(barrel.formatBlockNumber(undefined)).toBe('—');
      expect(barrel.formatBlockNumber('')).toBe('—');
      expect(barrel.formatBlockNumber('   ')).toBe('—');
    });

    it('passes non-numeric strings through unchanged instead of guessing', () => {
      expect(barrel.formatBlockNumber('pending')).toBe('pending');
    });

    it('groups digits for both numeric and string ledger sequences', () => {
      expect(barrel.formatBlockNumber(1234567)).toBe('1,234,567');
      expect(barrel.formatBlockNumber('1234567')).toBe('1,234,567');
      expect(barrel.formatBlockNumber('0')).toBe('0');
    });
  });

  describe('formatConfirmations boundaries', () => {
    it('returns the em-dash placeholder for undefined, negative and NaN input', () => {
      expect(barrel.formatConfirmations(undefined)).toBe('—');
      expect(barrel.formatConfirmations(-1)).toBe('—');
      expect(barrel.formatConfirmations(Number.NaN)).toBe('—');
    });

    it('renders zero confirmations as a real value', () => {
      expect(barrel.formatConfirmations(0)).toBe('0');
      expect(barrel.formatConfirmations(1200)).toBe('1,200');
    });
  });

  describe('formatTimeSince boundaries', () => {
    it('returns the em-dash placeholder for missing or unparseable timestamps', () => {
      expect(barrel.formatTimeSince(undefined)).toBe('—');
      expect(barrel.formatTimeSince('not-a-date')).toBe('—');
    });

    it('clamps future timestamps to zero rather than reporting negative age', () => {
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      expect(barrel.formatTimeSince('2026-06-01T00:00:00.000Z', now)).toBe('0s ago');
    });

    it('selects the coarsest sensible unit at major boundaries', () => {
      const now = Date.parse('2026-01-02T00:00:00.000Z');
      expect(barrel.formatTimeSince('2026-01-01T23:59:30.000Z', now)).toBe('30s ago');
      expect(barrel.formatTimeSince('2026-01-01T23:30:00.000Z', now)).toBe('30m ago');
      expect(barrel.formatTimeSince('2026-01-01T00:00:00.000Z', now)).toBe('1d ago');
    });
  });

  describe('explorer URL helpers', () => {
    it('defaults to the public network and percent-encodes the hash', () => {
      expect(barrel.buildStellarExplorerTxUrl(' a b/2 ')).toBe(
        'https://stellar.expert/explorer/public/tx/a%20b%2F2',
      );
      expect(barrel.buildStellarExplorerTxUrl('abc', 'testnet')).toBe(
        'https://stellar.expert/explorer/testnet/tx/abc',
      );
    });

    it('prefers an explicit explorerUrl over a derived one', () => {
      expect(
        barrel.resolveExplorerUrl({
          explorerUrl: ' https://example.test/tx/1 ',
          transactionHash: 'abc',
        }),
      ).toBe('https://example.test/tx/1');
    });

    it('derives from the transaction hash when no explicit URL is supplied', () => {
      expect(barrel.resolveExplorerUrl({ transactionHash: ' abc ' })).toBe(
        'https://stellar.expert/explorer/public/tx/abc',
      );
      expect(
        barrel.resolveExplorerUrl({ transactionHash: 'abc', network: 'testnet' }),
      ).toBe('https://stellar.expert/explorer/testnet/tx/abc');
    });

    it('returns undefined when neither an explicit URL nor a hash is present', () => {
      expect(barrel.resolveExplorerUrl({})).toBeUndefined();
      expect(barrel.resolveExplorerUrl({ explorerUrl: '   ' })).toBeUndefined();
      expect(barrel.resolveExplorerUrl({ transactionHash: '   ' })).toBeUndefined();
    });
  });
});
