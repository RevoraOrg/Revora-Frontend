import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'jest-axe';
import ActivityItem, { TransactionReceipt, normalizeTxStatus } from './ActivityItem';

describe('ActivityItem & TransactionReceipt', () => {
  const mockActivity = {
    id: 'act-123',
    type: 'payout' as const,
    title: 'Payout Initiated',
    description: 'A payout has been initiated to the provider',
    timestamp: '2026-08-29T12:00:00.000Z',
    isRead: false,
    transactionDetails: {
      transactionHash: 'G1234567890abcdefghijklmnopqrstuvwxyz',
      fromAddress: 'GD12345...SENDER',
      toAddress: 'GD67890...RECIPIENT',
      value: '100.00 XLM',
      status: 'completed' as const,
      gas: '0.00001 XLM',
      explorerUrl: 'https://stellar.expert/explorer/public/tx/G1234567890abcdefghijklmnopqrstuvwxyz',
      confirmations: 12,
      targetConfirmations: 12,
      blockNumber: 55001234,
      confirmedAt: '2026-08-29T12:01:00.000Z',
    },
  };

  const originalClipboard = navigator.clipboard;
  const mockWriteText = vi.fn();

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    Object.assign(navigator, {
      clipboard: originalClipboard,
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders happy path for ActivityItem (collapsed by default)', () => {
    render(<ActivityItem activity={mockActivity} />);
    expect(screen.getByText('Payout Initiated')).toBeInTheDocument();
    expect(screen.getByText('A payout has been initiated to the provider')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-receipt-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('tx-receipt-panel')).not.toBeInTheDocument();
  });

  it('toggles transaction receipt visibility on click', async () => {
    render(<ActivityItem activity={mockActivity} />);
    const toggleBtn = screen.getByTestId('toggle-receipt-btn');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Expand
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('tx-receipt-panel')).toBeInTheDocument();

    // Collapse
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('tx-receipt-panel')).not.toBeInTheDocument();
  });

  it('renders TransactionReceipt content correctly when expanded', () => {
    render(<ActivityItem activity={mockActivity} />);
    fireEvent.click(screen.getByTestId('toggle-receipt-btn'));

    expect(screen.getByTestId('tx-status')).toHaveTextContent('Confirmed');
    expect(screen.getByTestId('tx-hash')).toHaveTextContent('G12345…uvwxyz');
    expect(screen.getByTestId('tx-from')).toHaveTextContent('GD12345...SENDER');
    expect(screen.getByTestId('tx-to')).toHaveTextContent('GD67890...RECIPIENT');
    expect(screen.getByTestId('tx-value')).toHaveTextContent('100.00 XLM');
    expect(screen.getByTestId('tx-gas')).toHaveTextContent('0.00001 XLM');

    // The status badge now renders an icon paired with the text label
    const statusBadge = screen.getByTestId('tx-status');
    expect(statusBadge.querySelector('svg')).toBeInTheDocument();
    expect(statusBadge.querySelector('.onchain-badge')).toBeInTheDocument();

    const explorerLink = screen.getByTestId('tx-explorer-link');
    expect(explorerLink).toBeInTheDocument();
    expect(explorerLink).toHaveAttribute('href', mockActivity.transactionDetails.explorerUrl);
    expect(explorerLink).toHaveAttribute('target', '_blank');
    expect(explorerLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('exposes confirmations in the on-chain status tooltip when expanded', () => {
    render(<ActivityItem activity={mockActivity} />);
    fireEvent.click(screen.getByTestId('toggle-receipt-btn'));

    const badge = screen.getByTestId('onchain-badge-confirmed');
    fireEvent.focus(badge);

    const tooltip = screen.getByTestId('onchain-badge-tooltip');
    expect(tooltip).toHaveClass('ob-tooltip--open');
    expect(screen.getByTestId('ob-tooltip-block')).toHaveTextContent('55,001,234');
    expect(screen.getByTestId('ob-tooltip-confirmations')).toHaveTextContent('12 / 12');
  });

  it('supports fallback to default Stellar Expert link if explorerUrl is omitted', () => {
    const activityWithoutUrl = {
      ...mockActivity,
      transactionDetails: {
        ...mockActivity.transactionDetails,
        explorerUrl: '',
      },
    };
    render(<ActivityItem activity={activityWithoutUrl} />);
    fireEvent.click(screen.getByTestId('toggle-receipt-btn'));

    const explorerLink = screen.getByTestId('tx-explorer-link');
    expect(explorerLink).toBeInTheDocument();
    expect(explorerLink.getAttribute('href')).toContain('stellar.expert/explorer/public/tx/');
  });

  it('handles copy success and clipboard write', async () => {
    vi.useFakeTimers();
    mockWriteText.mockResolvedValue(undefined);
    render(<TransactionReceipt {...mockActivity.transactionDetails} />);

    const copyBtn = screen.getByTestId('tx-copy-btn');
    fireEvent.click(copyBtn);

    // Advance slightly to flush promise resolution and state render
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(mockWriteText).toHaveBeenCalledWith(mockActivity.transactionDetails.transactionHash);

    // Verify visual toast exists
    expect(screen.getByTestId('tx-toast')).toHaveTextContent(/copied to clipboard/i);

    // Verify screen reader live region announcement
    const liveRegion = screen.getByTestId('tx-live-region');
    expect(liveRegion).toHaveTextContent(/copied to clipboard/i);

    // Fast-forward timers to check toast auto-dismiss
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.queryByTestId('tx-toast')).not.toBeInTheDocument();
  });

  it('handles copy failure gracefully', async () => {
    vi.useFakeTimers();
    mockWriteText.mockRejectedValue(new Error('Permission denied'));
    
    // Stub execCommand since JSDOM does not implement it
    const mockExec = vi.fn().mockReturnValue(true);
    document.execCommand = mockExec;

    render(<TransactionReceipt {...mockActivity.transactionDetails} />);
    const copyBtn = screen.getByTestId('tx-copy-btn');
    
    fireEvent.click(copyBtn);

    // Advance slightly to flush rejected promise and fallback copy execution
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(mockExec).toHaveBeenCalledWith('copy');

    // Verify visual toast exists because fallback copy succeeded
    expect(screen.getByTestId('tx-toast')).toHaveTextContent(/copied to clipboard/i);

    // Clean up
    delete (document as any).execCommand;
  });

  it('renders fallbacks for missing or empty data', () => {
    const invalidReceipt = {
      transactionHash: '',
      fromAddress: '',
      toAddress: '',
      value: '',
      status: undefined,
      gas: '',
      explorerUrl: '',
    };
    render(<TransactionReceipt {...invalidReceipt} />);

    expect(screen.getByTestId('tx-status')).toHaveTextContent('—');
    expect(screen.getByTestId('tx-hash-fallback')).toHaveTextContent('—');
    expect(screen.getByTestId('tx-from')).toHaveTextContent('—');
    expect(screen.getByTestId('tx-to')).toHaveTextContent('—');
    expect(screen.getByTestId('tx-value')).toHaveTextContent('—');
    expect(screen.getByTestId('tx-gas')).toHaveTextContent('—');
    expect(screen.queryByTestId('tx-explorer-link')).not.toBeInTheDocument();
  });

  it('applies correct status badge classes', () => {
    const { rerender } = render(<TransactionReceipt status="pending" />);
    expect(screen.getByTestId('tx-status')).toHaveClass('status-pending');

    rerender(<TransactionReceipt status="failed" />);
    expect(screen.getByTestId('tx-status')).toHaveClass('status-failed');

    rerender(<TransactionReceipt status="completed" />);
    expect(screen.getByTestId('tx-status')).toHaveClass('status-completed');

    rerender(<TransactionReceipt status="success" />);
    expect(screen.getByTestId('tx-status')).toHaveClass('status-success');
  });

  it.each([
    ['completed', 'confirmed'],
    ['success', 'confirmed'],
    ['confirmed', 'confirmed'],
    ['pending', 'pending'],
    ['confirming', 'confirming'],
    ['failed', 'failed'],
    ['error', 'failed'],
    ['reorged', 'reorged'],
    ['REORGED', 'reorged'],
    ['PENDING', 'pending'],
  ] as const)('maps legacy status %s to badge variant %s', (raw, expected) => {
    expect(normalizeTxStatus(raw)).toBe(expected);
  });

  it('normalizes empty, whitespace and unknown statuses to undefined', () => {
    expect(normalizeTxStatus()).toBeUndefined();
    expect(normalizeTxStatus('')).toBeUndefined();
    expect(normalizeTxStatus('   ')).toBeUndefined();
    expect(normalizeTxStatus('nope')).toBeUndefined();
  });

  it('renders the on-chain badge for each supported status', () => {
    const { rerender } = render(<TransactionReceipt status="pending" />);
    expect(screen.getByTestId('onchain-badge-pending')).toBeInTheDocument();

    rerender(<TransactionReceipt status="confirming" />);
    expect(screen.getByTestId('onchain-badge-confirming')).toBeInTheDocument();

    rerender(<TransactionReceipt status="failed" />);
    expect(screen.getByTestId('onchain-badge-failed')).toBeInTheDocument();

    rerender(<TransactionReceipt status="reorged" />);
    expect(screen.getByTestId('onchain-badge-reorged')).toBeInTheDocument();
  });

  it('has no accessibility violations when rendered/expanded', async () => {
    const { container } = render(<ActivityItem activity={mockActivity} />);
    
    // Check collapsed state accessibility
    let results = await axe(container);
    expect(results).toHaveNoViolations();

    // Expand receipt
    fireEvent.click(screen.getByTestId('toggle-receipt-btn'));

    // Check expanded state accessibility
    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
