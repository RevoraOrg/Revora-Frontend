import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { OnChainStatusBadge } from './OnChainStatusBadge';

expect.extend(toHaveNoViolations);

const fullMetadata = {
  blockNumber: 55001234,
  transactionHash: 'a1b2c3d4e5f6789012345678901234567890abcd',
  confirmations: 42,
  confirmedAt: '2026-07-27T10:00:00.000Z',
  network: 'testnet' as const,
};

function mockMatchMedia(options: { coarse?: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('pointer: coarse')
      ? Boolean(options.coarse)
      : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('OnChainStatusBadge', () => {
  beforeEach(() => {
    mockMatchMedia({ coarse: false });
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the on-chain badge control', () => {
    render(<OnChainStatusBadge metadata={fullMetadata} />);
    expect(
      screen.getByRole('button', { name: /on-chain confirmation details/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('On-chain')).toBeInTheDocument();
  });

  it('shows metadata fields in the tooltip panel', () => {
    render(<OnChainStatusBadge metadata={fullMetadata} />);
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('Hash')).toBeInTheDocument();
    expect(screen.getByText('55,001,234')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3…abcd')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders explorer link when hash is available', () => {
    render(<OnChainStatusBadge metadata={fullMetadata} />);
    const link = screen.getByRole('link', { name: /open in explorer/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('stellar.expert/explorer/testnet/tx/'),
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('handles missing metadata with placeholders', () => {
    render(<OnChainStatusBadge metadata={{}} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Explorer link unavailable')).toBeInTheDocument();
  });

  it('announces copy success via polite live region', async () => {
    render(<OnChainStatusBadge metadata={fullMetadata} />);

    fireEvent.click(screen.getByRole('button', { name: /copy hash/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Transaction hash copied to clipboard.',
      );
    });
    // fireEvent.click triggers the real clipboard call;
    // verify the live region text above confirms the flow.
  });

  it('disables copy when block number is missing', () => {
    render(
      <OnChainStatusBadge
        metadata={{ transactionHash: fullMetadata.transactionHash }}
      />,
    );
    expect(screen.getByRole('button', { name: /block unavailable/i })).toBeDisabled();
  });

  it('toggles popover on coarse pointer click', async () => {
    mockMatchMedia({ coarse: true });
    const user = userEvent.setup();
    render(<OnChainStatusBadge metadata={fullMetadata} />);

    const trigger = screen.getByRole('button', {
      name: /on-chain confirmation details/i,
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes popover on Escape', async () => {
    mockMatchMedia({ coarse: true });
    const user = userEvent.setup();
    render(<OnChainStatusBadge metadata={fullMetadata} />);

    const trigger = screen.getByRole('button', {
      name: /on-chain confirmation details/i,
    });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no axe violations when rendered', async () => {
    const { container } = render(
      <OnChainStatusBadge metadata={fullMetadata} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('supports RTL document direction', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    render(<OnChainStatusBadge metadata={fullMetadata} />);
    expect(screen.getByTestId('onchain-status-badge')).toBeInTheDocument();
    document.documentElement.removeAttribute('dir');
  });

  // ─── Status variants (Issue #478) ──────────────────────────────

  describe('status variants', () => {
    it('shows "Pending" label when status is pending', () => {
      render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'pending' }} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows "Retrying" label when status is retrying', () => {
      render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'retrying' }} />);
      expect(screen.getByText('Retrying')).toBeInTheDocument();
    });

    it('shows "Confirmed (N)" label with confirmation count', () => {
      render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'confirmed', confirmations: 42 }} />);
      expect(screen.getByText('Confirmed (42)')).toBeInTheDocument();
    });

    it('renders pending variant with amber styling class', () => {
      render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'pending' }} />);
      const badge = screen.getByRole('button', { name: /on-chain/i });
      expect(badge).toHaveClass('ocb-badge--pending');
    });

    it('renders retrying variant with indigo styling class', () => {
      render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'retrying' }} />);
      const badge = screen.getByRole('button', { name: /on-chain/i });
      expect(badge).toHaveClass('ocb-badge--retrying');
    });

    it('renders confirmed variant with green styling class', () => {
      render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'confirmed' }} />);
      const badge = screen.getByRole('button', { name: /on-chain/i });
      expect(badge).toHaveClass('ocb-badge--confirmed');
    });

    it('shows "On-chain" when no status is provided (backward compatible)', () => {
      render(<OnChainStatusBadge metadata={fullMetadata} />);
      expect(screen.getByText('On-chain')).toBeInTheDocument();
    });

    it('shows confirmations in label only for confirmed status', () => {
      const { rerender } = render(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'pending', confirmations: 5 }} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();

      rerender(<OnChainStatusBadge metadata={{ ...fullMetadata, status: 'confirmed', confirmations: 5 }} />);
      expect(screen.getByText('Confirmed (5)')).toBeInTheDocument();
    });
  });
});
