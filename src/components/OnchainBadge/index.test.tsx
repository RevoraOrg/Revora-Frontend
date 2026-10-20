import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import * as OnchainBadgeIndex from './index';
import {
  OnchainBadge,
  type OnchainBadgeVariant,
  type OnchainBadgeMetadata,
  type OnchainBadgeProps,
} from './index';
import { OnchainBadge as DirectOnchainBadge } from './OnchainBadge';

expect.extend(toHaveNoViolations);

describe('OnchainBadge index module exports and public contract', () => {
  it('exposes OnchainBadge component directly from index barrel', () => {
    expect(typeof OnchainBadgeIndex.OnchainBadge).toBe('function');
    expect(OnchainBadgeIndex.OnchainBadge).toBe(DirectOnchainBadge);
    expect(OnchainBadge).toBe(DirectOnchainBadge);
    expect(OnchainBadge.displayName).toBe('OnchainBadge');
  });

  it('preserves clean public contract without leaking internal helpers', () => {
    const exportedKeys = Object.keys(OnchainBadgeIndex);
    expect(exportedKeys).toEqual(['OnchainBadge']);
    expect((OnchainBadgeIndex as Record<string, unknown>).getIcon).toBeUndefined();
    expect((OnchainBadgeIndex as Record<string, unknown>).Counter).toBeUndefined();
    expect((OnchainBadgeIndex as Record<string, unknown>).getAriaLabel).toBeUndefined();
    expect((OnchainBadgeIndex as Record<string, unknown>).hasTooltipableMetadata).toBeUndefined();
    expect((OnchainBadgeIndex as Record<string, unknown>).SIZE_ICON_MAP).toBeUndefined();
  });

  it('allows importing and type-checking exported TypeScript types', () => {
    const variant: OnchainBadgeVariant = 'confirming';
    const metadata: OnchainBadgeMetadata = {
      blockNumber: 1234567,
      confirmedAt: '2026-09-27T18:00:00Z',
      network: 'testnet',
    };
    const props: OnchainBadgeProps = {
      variant,
      currentConfirmations: 3,
      targetConfirmations: 12,
      size: 'md',
      metadata,
    };

    expect(props.variant).toBe('confirming');
    expect(props.metadata?.network).toBe('testnet');
  });
});

describe('Primary state transitions across all variants (via index export)', () => {
  const allVariants: OnchainBadgeVariant[] = [
    'pending',
    'retrying',
    'confirming',
    'confirmed',
    'failed',
    'reorged',
  ];

  it.each(allVariants)('renders %s variant with role="status" and distinct testid', (variant) => {
    render(<OnchainBadge variant={variant} />);
    const badge = screen.getByTestId(`onchain-badge-${variant}`);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('role', 'status');
    expect(badge).toHaveClass('onchain-badge', `onchain-badge--${variant}`, 'onchain-badge--md');
  });

  it('renders pending state with Clock icon, Pending label, and accessible description', () => {
    render(<OnchainBadge variant="pending" currentConfirmations={0} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-pending');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(badge.querySelector('svg')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Transaction pending - waiting for network confirmation',
    );
    expect(screen.queryByText('/12')).not.toBeInTheDocument();
  });

  it('renders retrying state with RefreshCw icon, Retrying label, and accessible description', () => {
    render(<OnchainBadge variant="retrying" currentConfirmations={0} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-retrying');
    expect(screen.getByText('Retrying')).toBeInTheDocument();
    expect(badge.querySelector('svg')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Transaction retrying - attempting to resubmit to the network',
    );
    expect(screen.queryByText('/12')).not.toBeInTheDocument();
  });

  it('renders confirming state with ArrowUpCircle icon, Confirming label, and active counter', () => {
    render(<OnchainBadge variant="confirming" currentConfirmations={4} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-confirming');
    expect(screen.getByText('Confirming')).toBeInTheDocument();
    expect(badge.querySelector('svg')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Transaction confirming - 4 of 12 confirmations received',
    );
    expect(screen.getByText('·')).toBeInTheDocument();
    expect(screen.getByText('/12')).toBeInTheDocument();
  });

  it('renders confirmed state with CheckCircle2 icon, Confirmed label, and complete counter', () => {
    render(<OnchainBadge variant="confirmed" currentConfirmations={12} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(badge.querySelector('svg')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Transaction confirmed with 12 of 12 confirmations',
    );
    expect(screen.getByText('·')).toBeInTheDocument();
    expect(screen.getByText('/12')).toBeInTheDocument();
  });

  it('renders failed state with XCircle icon, Failed label, and failure aria description', () => {
    render(<OnchainBadge variant="failed" currentConfirmations={2} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-failed');
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(badge.querySelector('svg')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Transaction failed - the on-chain operation did not succeed',
    );
    expect(screen.queryByText('/12')).not.toBeInTheDocument();
  });

  it('renders reorged state with RotateCcw icon, Reorged label, and reorg description', () => {
    render(<OnchainBadge variant="reorged" currentConfirmations={12} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-reorged');
    expect(screen.getByText('Reorged')).toBeInTheDocument();
    expect(badge.querySelector('svg')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Transaction reorged - removed from the chain by a chain reorganization',
    );
    expect(screen.queryByText('/12')).not.toBeInTheDocument();
  });
});

describe('Dynamic state transitions simulating full transaction lifecycle', () => {
  it('transitions smoothly along the standard confirmation lifecycle: pending -> confirming -> confirmed', () => {
    const { rerender } = render(
      <OnchainBadge variant="pending" targetConfirmations={12} />,
    );

    let badge = screen.getByTestId('onchain-badge-pending');
    expect(badge).toHaveAttribute('aria-label', 'Transaction pending - waiting for network confirmation');
    expect(screen.queryByText('/12')).not.toBeInTheDocument();

    // Step 1: Network picks up transaction, 1 confirmation
    rerender(
      <OnchainBadge variant="confirming" currentConfirmations={1} targetConfirmations={12} />,
    );
    badge = screen.getByTestId('onchain-badge-confirming');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirming - 1 of 12 confirmations received');
    expect(screen.getByText('/12')).toBeInTheDocument();

    // Step 2: Intermediate confirmations
    rerender(
      <OnchainBadge variant="confirming" currentConfirmations={8} targetConfirmations={12} />,
    );
    badge = screen.getByTestId('onchain-badge-confirming');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirming - 8 of 12 confirmations received');

    // Step 3: Fully confirmed
    rerender(
      <OnchainBadge variant="confirmed" currentConfirmations={12} targetConfirmations={12} />,
    );
    badge = screen.getByTestId('onchain-badge-confirmed');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirmed with 12 of 12 confirmations');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('transitions along the retry and recovery flow: pending -> failed -> retrying -> confirming -> confirmed', () => {
    const { rerender } = render(<OnchainBadge variant="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Submission fails
    rerender(<OnchainBadge variant="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();

    // Automated retry initiated
    rerender(<OnchainBadge variant="retrying" />);
    expect(screen.getByText('Retrying')).toBeInTheDocument();

    // Resubmission accepted, confirms
    rerender(<OnchainBadge variant="confirming" currentConfirmations={2} targetConfirmations={6} />);
    expect(screen.getByText('Confirming')).toBeInTheDocument();
    expect(screen.getByText('/6')).toBeInTheDocument();

    // Confirmed
    rerender(<OnchainBadge variant="confirmed" currentConfirmations={6} targetConfirmations={6} />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('transitions from confirmed to reorged upon chain reorganization', () => {
    const { rerender } = render(
      <OnchainBadge variant="confirmed" currentConfirmations={12} targetConfirmations={12} />,
    );
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    // Chain reorg detected
    rerender(<OnchainBadge variant="reorged" currentConfirmations={0} targetConfirmations={12} />);
    expect(screen.getByText('Reorged')).toBeInTheDocument();
    expect(screen.queryByText('/12')).not.toBeInTheDocument();
  });
});

describe('Representative invalid inputs and boundary edge cases', () => {
  it('handles omitted currentConfirmations and targetConfirmations safely', () => {
    render(<OnchainBadge variant="confirming" />);
    const badge = screen.getByTestId('onchain-badge-confirming');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirming - 0 of 0 confirmations received');
    expect(screen.getByText('/0')).toBeInTheDocument();
  });

  it('handles negative confirmation counts without throwing exceptions', () => {
    render(
      <OnchainBadge
        variant="confirming"
        currentConfirmations={-1}
        targetConfirmations={-5}
        transactionHash="0xabc123"
      />,
    );
    const badge = screen.getByTestId('onchain-badge-confirming');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirming - -1 of -5 confirmations received');
    expect(screen.getByText('/-5')).toBeInTheDocument();

    // Tooltip formatting handles negative numbers by falling back to em-dash
    const confirmationsCell = screen.getByTestId('ob-tooltip-confirmations');
    expect(confirmationsCell).toHaveTextContent('— / —');
  });

  it('handles floating point and decimal confirmation values deterministically', () => {
    render(<OnchainBadge variant="confirming" currentConfirmations={3.7} targetConfirmations={12.5} />);
    const badge = screen.getByTestId('onchain-badge-confirming');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirming - 3.7 of 12.5 confirmations received');
    expect(screen.getByText('/12.5')).toBeInTheDocument();
  });

  it('handles currentConfirmations exceeding targetConfirmations', () => {
    render(<OnchainBadge variant="confirming" currentConfirmations={18} targetConfirmations={12} />);
    const badge = screen.getByTestId('onchain-badge-confirming');
    expect(badge).toHaveAttribute('aria-label', 'Transaction confirming - 18 of 12 confirmations received');
    expect(screen.getByText('/12')).toBeInTheDocument();
  });

  it('handles large confirmation numbers in tooltip formatting', () => {
    render(
      <OnchainBadge
        variant="confirmed"
        currentConfirmations={1000000}
        targetConfirmations={1000000}
        transactionHash="0xabc"
      />,
    );
    expect(screen.getByTestId('ob-tooltip-confirmations')).toHaveTextContent('1,000,000 / 1,000,000');
  });

  describe('size prop boundary handling', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies the correct size modifier class for size="%s"', (size) => {
      const { container } = render(<OnchainBadge variant="confirmed" size={size} />);
      const badge = container.querySelector(`.onchain-badge--${size}`);
      expect(badge).toBeInTheDocument();
    });

    it('defaults to md size when size prop is omitted or undefined', () => {
      const { container } = render(<OnchainBadge variant="confirmed" size={undefined} />);
      expect(container.querySelector('.onchain-badge--md')).toBeInTheDocument();
    });
  });

  describe('className prop boundary handling', () => {
    it('appends custom classNames cleanly without removing base classes', () => {
      render(<OnchainBadge variant="pending" className="audit-custom-class extra-modifier" />);
      const badge = screen.getByTestId('onchain-badge-pending');
      expect(badge).toHaveClass('onchain-badge', 'onchain-badge--pending', 'audit-custom-class', 'extra-modifier');
    });

    it('handles empty string className without trailing spaces', () => {
      render(<OnchainBadge variant="pending" className="" />);
      const badge = screen.getByTestId('onchain-badge-pending');
      expect(badge.className).toBe('onchain-badge onchain-badge--pending onchain-badge--md');
    });
  });

  describe('metadata and explorerUrl boundary conditions', () => {
    it('does not render tooltip when showTooltip={false} even if metadata is present', () => {
      render(
        <OnchainBadge
          variant="confirmed"
          showTooltip={false}
          metadata={{ blockNumber: 12345, confirmedAt: '2026-09-27T18:00:00Z' }}
          transactionHash="0xabc123"
        />,
      );
      const badge = screen.getByTestId('onchain-badge-confirmed');
      expect(badge).not.toHaveAttribute('tabindex');
      expect(badge).not.toHaveAttribute('aria-describedby');
      expect(screen.queryByTestId('onchain-badge-tooltip')).not.toBeInTheDocument();
    });

    it('does not render tooltip when metadata is empty and no transactionHash/explorerUrl is provided', () => {
      render(<OnchainBadge variant="confirmed" metadata={{}} />);
      const badge = screen.getByTestId('onchain-badge-confirmed');
      expect(badge).not.toHaveAttribute('tabindex');
      expect(badge).not.toHaveAttribute('aria-describedby');
      expect(screen.queryByTestId('onchain-badge-tooltip')).not.toBeInTheDocument();
    });

    it('does not render tooltip when metadata fields are only blank strings and hash is empty whitespace', () => {
      render(
        <OnchainBadge
          variant="confirmed"
          metadata={{ blockNumber: '   ', confirmedAt: '' }}
          transactionHash="   "
          explorerUrl="   "
        />,
      );
      expect(screen.queryByTestId('onchain-badge-tooltip')).not.toBeInTheDocument();
    });

    it('renders blockNumber 0 correctly as numeric "0"', () => {
      render(<OnchainBadge variant="confirmed" metadata={{ blockNumber: 0 }} />);
      expect(screen.getByTestId('ob-tooltip-block')).toHaveTextContent('0');
    });

    it('formats numeric and string blockNumber with commas', () => {
      const { rerender } = render(
        <OnchainBadge variant="confirmed" metadata={{ blockNumber: 9876543 }} />,
      );
      expect(screen.getByTestId('ob-tooltip-block')).toHaveTextContent('9,876,543');

      rerender(<OnchainBadge variant="confirmed" metadata={{ blockNumber: '55443322' }} />);
      expect(screen.getByTestId('ob-tooltip-block')).toHaveTextContent('55,443,322');
    });

    it('displays non-numeric block string as-is without crashing', () => {
      render(<OnchainBadge variant="confirmed" metadata={{ blockNumber: 'genesis-block' }} />);
      expect(screen.getByTestId('ob-tooltip-block')).toHaveTextContent('genesis-block');
    });

    it('renders relative time for valid ISO confirmedAt', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      render(<OnchainBadge variant="confirmed" metadata={{ confirmedAt: fiveMinAgo }} />);
      expect(screen.getByTestId('ob-tooltip-time')).toHaveTextContent(/5m ago/);
    });

    it('renders fallback dash for malformed confirmedAt string', () => {
      render(<OnchainBadge variant="confirmed" metadata={{ confirmedAt: 'not-a-valid-timestamp' }} />);
      expect(screen.getByTestId('ob-tooltip-time')).toHaveTextContent('—');
    });

    it('resolves testnet explorer URL correctly when network is testnet', () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash="abc123hash"
          metadata={{ network: 'testnet' }}
        />,
      );
      const badge = screen.getByTestId('onchain-badge-confirmed');
      fireEvent.mouseEnter(badge);

      const link = screen.getByTestId('ob-tooltip-explorer');
      expect(link).toHaveAttribute(
        'href',
        'https://stellar.expert/explorer/testnet/tx/abc123hash',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('resolves public explorer URL when network is public or omitted', () => {
      const { rerender } = render(
        <OnchainBadge
          variant="confirmed"
          transactionHash="txhashpublic"
          metadata={{ network: 'public' }}
        />,
      );
      let badge = screen.getByTestId('onchain-badge-confirmed');
      fireEvent.mouseEnter(badge);

      let link = screen.getByTestId('ob-tooltip-explorer');
      expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/public/tx/txhashpublic');

      rerender(<OnchainBadge variant="confirmed" transactionHash="txhashdefault" />);
      badge = screen.getByTestId('onchain-badge-confirmed');
      fireEvent.mouseEnter(badge);
      link = screen.getByTestId('ob-tooltip-explorer');
      expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/public/tx/txhashdefault');
    });

    it('prefers explicit explorerUrl over default transactionHash link', () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash="txhash"
          explorerUrl="https://custom-explorer.org/tx/custom123"
        />,
      );
      const badge = screen.getByTestId('onchain-badge-confirmed');
      fireEvent.mouseEnter(badge);

      const link = screen.getByTestId('ob-tooltip-explorer');
      expect(link).toHaveAttribute('href', 'https://custom-explorer.org/tx/custom123');
    });

    it('displays "Explorer link unavailable" when tooltip metadata is present but no valid URL can be formed', () => {
      render(<OnchainBadge variant="confirmed" metadata={{ blockNumber: 12345 }} />);
      const badge = screen.getByTestId('onchain-badge-confirmed');
      fireEvent.mouseEnter(badge);

      const disabledNotice = screen.getByText('Explorer link unavailable');
      expect(disabledNotice).toBeInTheDocument();
      expect(disabledNotice).toHaveClass('ob-tooltip-link', 'ob-tooltip-link--disabled');
      expect(disabledNotice).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

describe('Tooltip interactivity and state transitions (open, close, dismissal, reset)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links badge to tooltip using aria-describedby and id', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    const tooltipId = tooltip.getAttribute('id');
    expect(tooltipId).toBeTruthy();
    expect(badge).toHaveAttribute('aria-describedby', tooltipId);
    expect(badge).toHaveAttribute('tabindex', '0');
  });

  it('opens tooltip on mouseEnter and closes on mouseLeave', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    expect(tooltip).not.toHaveClass('ob-tooltip--open');

    fireEvent.mouseEnter(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');

    fireEvent.mouseLeave(badge);
    expect(tooltip).not.toHaveClass('ob-tooltip--open');
  });

  it('opens tooltip on focus and closes on blur', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    expect(tooltip).not.toHaveClass('ob-tooltip--open');

    fireEvent.focus(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');

    fireEvent.blur(badge);
    expect(tooltip).not.toHaveClass('ob-tooltip--open');
  });

  it('dismisses tooltip and stops propagation when Escape is pressed while tooltip is open', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    fireEvent.mouseEnter(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stopSpy = vi.spyOn(event, 'stopPropagation');
    act(() => {
      document.dispatchEvent(event);
    });
    expect(stopSpy).toHaveBeenCalled();
    expect(tooltip).not.toHaveClass('ob-tooltip--open');
  });

  it('ignores other keys like Enter or Space when tooltip is open', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    fireEvent.mouseEnter(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(tooltip).toHaveClass('ob-tooltip--open');

    fireEvent.keyDown(document, { key: ' ' });
    expect(tooltip).toHaveClass('ob-tooltip--open');
  });

  it('clears dismissed state on mouseLeave allowing subsequent hover to reopen', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    // Open and dismiss with Escape
    fireEvent.mouseEnter(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tooltip).not.toHaveClass('ob-tooltip--open');

    // While still dismissed, re-triggering mouseEnter does not open
    fireEvent.mouseEnter(badge);
    expect(tooltip).not.toHaveClass('ob-tooltip--open');

    // Leaving the element clears dismissed state
    fireEvent.mouseLeave(badge);

    // Now re-entering successfully opens tooltip
    fireEvent.mouseEnter(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');
  });

  it('clears dismissed state on blur allowing subsequent focus to reopen', () => {
    render(<OnchainBadge variant="confirmed" transactionHash="0x123" />);
    const badge = screen.getByTestId('onchain-badge-confirmed');
    const tooltip = screen.getByTestId('onchain-badge-tooltip');

    fireEvent.focus(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tooltip).not.toHaveClass('ob-tooltip--open');

    // Blurring clears dismissed flag
    fireEvent.blur(badge);

    // Re-focusing opens tooltip
    fireEvent.focus(badge);
    expect(tooltip).toHaveClass('ob-tooltip--open');
  });
});

describe('Reduced motion and animation frame cleanup', () => {
  it('renders counter immediately when prefers-reduced-motion is true', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    render(<OnchainBadge variant="confirming" currentConfirmations={9} targetConfirmations={12} />);
    const counter = screen.getByText('9');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveClass('ob-counter');
  });

  it('animates counter and cleans up animation frame on unmount', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 12345;
    });
    const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = render(
      <OnchainBadge variant="confirming" currentConfirmations={10} targetConfirmations={12} />,
    );

    expect(rafSpy).toHaveBeenCalled();

    // Trigger an animation step
    if (rafCallback) {
      act(() => {
        (rafCallback as FrameRequestCallback)(400);
      });
    }

    unmount();
    expect(cancelRafSpy).toHaveBeenCalledWith(12345);

    rafSpy.mockRestore();
    cancelRafSpy.mockRestore();
  });
});

describe('Accessibility (a11y) and WCAG compliance via jest-axe', () => {
  const variants: OnchainBadgeVariant[] = [
    'pending',
    'retrying',
    'confirming',
    'confirmed',
    'failed',
    'reorged',
  ];

  it.each(variants)('has no axe accessibility violations for %s resting state', async (variant) => {
    const { container } = render(
      <OnchainBadge
        variant={variant}
        currentConfirmations={variant === 'confirming' || variant === 'confirmed' ? 6 : undefined}
        targetConfirmations={12}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with tooltip rendered and open', async () => {
    const { container } = render(
      <OnchainBadge
        variant="confirmed"
        currentConfirmations={12}
        targetConfirmations={12}
        transactionHash="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        metadata={{
          blockNumber: 456789,
          confirmedAt: new Date(Date.now() - 60000).toISOString(),
          network: 'public',
        }}
      />,
    );

    const badge = screen.getByTestId('onchain-badge-confirmed');
    fireEvent.mouseEnter(badge);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('marks decorative icons, separators, and counters with aria-hidden="true"', () => {
    const { container } = render(
      <OnchainBadge
        variant="confirming"
        currentConfirmations={5}
        targetConfirmations={12}
        transactionHash="0xabc"
      />,
    );

    // Main status icon has aria-hidden
    const iconWrapper = container.querySelector('.ob-icon');
    expect(iconWrapper?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    // Separator has aria-hidden
    const separator = container.querySelector('.ob-separator');
    expect(separator).toHaveAttribute('aria-hidden', 'true');

    // Counter has aria-hidden
    const counter = container.querySelector('.ob-counter');
    expect(counter).toHaveAttribute('aria-hidden', 'true');

    // Target label has aria-hidden
    const target = container.querySelector('.ob-target');
    expect(target).toHaveAttribute('aria-hidden', 'true');
  });
});
