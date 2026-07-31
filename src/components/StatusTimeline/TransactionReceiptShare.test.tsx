/**
 * TransactionReceiptShare.test.tsx — Issue #481
 *
 * Comprehensive tests for the enhanced TransactionReceiptShare component.
 * Covers: rendering, aspect ratios, hide-amount toggle, download, copy-image,
 * clipboard fallback, toast notifications, accessibility (axe), RTL, responsive.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'jest-axe';
import { TransactionReceiptShare } from './TransactionReceiptShare';
import type { TransactionReceiptShareProps } from './TransactionReceiptShare';
import html2canvas from 'html2canvas';

/* ─── Mocks ─────────────────────────────────────────────────── */

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
    toBlob: vi.fn().mockImplementation((cb: (blob: Blob) => void) =>
      cb(new Blob(['mock'], { type: 'image/png' })),
    ),
  }),
}));

/* ─── Helpers ────────────────────────────────────────────────── */

const DEFAULT_PROPS: TransactionReceiptShareProps = {
  transactionId: 'TX-12345',
  date: 'Oct 24, 2023 14:30',
  amount: '1,500.00',
  currency: 'USDC',
  status: 'completed',
  senderWallet: '0x1234567890abcdef1234567890abcdef12345678',
  recipientWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
};

function renderReceipt(overrides: Partial<TransactionReceiptShareProps> = {}) {
  return render(<TransactionReceiptShare {...DEFAULT_PROPS} {...overrides} />);
}

/* ─── Test suite ────────────────────────────────────────────── */

describe('TransactionReceiptShare', () => {
  const mockClipboardWrite = vi.fn();
  let mockAnchorClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock requestAnimationFrame to use setTimeout so it works with fake timers
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(() => cb(Date.now()), 0) as unknown as number;
    });

    // navigator.clipboard is getter-only in modern jsdom — use defineProperty
    const clipboardMock = {
      write: mockClipboardWrite.mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboardMock,
      writable: true,
      configurable: true,
    });

    // Stub ClipboardItem globally with a proper constructor (arrow fns can't be used with new)
    const clipboardItemMock = vi.fn().mockImplementation(function(this: any, data: Record<string, Blob>) {
      return data;
    });
    vi.stubGlobal('ClipboardItem', clipboardItemMock);

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');

    // Mock HTMLAnchorElement.prototype.click for download tests
    mockAnchorClick = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockAnchorClick);
  });

  afterEach(() => {
    // Restore ClipboardItem stub with constructable mock
    const clipboardItemMock = vi.fn().mockImplementation(function(this: any, data: Record<string, Blob>) {
      return data;
    });
    vi.stubGlobal('ClipboardItem', clipboardItemMock);
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /* ── Rendering ────────────────────────────────────────────── */

  describe('rendering', () => {
    it('renders all receipt fields correctly', () => {
      renderReceipt();
      expect(screen.getByTestId('tx-receipt-share')).toBeInTheDocument();
      expect(screen.getByTestId('tx-receipt-card')).toBeInTheDocument();
      expect(screen.getByText('TX-12345')).toBeInTheDocument();
      expect(screen.getByText('1,500.00 USDC')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('Oct 24, 2023 14:30')).toBeInTheDocument();
      expect(screen.getByText(DEFAULT_PROPS.senderWallet)).toBeInTheDocument();
      expect(screen.getByText(DEFAULT_PROPS.recipientWallet)).toBeInTheDocument();
    });

    it('renders issuer name and default branding', () => {
      renderReceipt({ issuerName: 'AcmeCorp' });
      expect(screen.getByText('AcmeCorp')).toBeInTheDocument();
    });

    it('renders issuer logo when provided', () => {
      renderReceipt({ issuerName: 'AcmeCorp', issuerLogoUrl: 'https://example.com/logo.png' });
      expect(screen.getByAltText('AcmeCorp logo')).toBeInTheDocument();
    });

    it('renders without issuer logo gracefully', () => {
      renderReceipt();
      expect(screen.queryByAltText(/logo/i)).not.toBeInTheDocument();
    });

    it('renders transaction hash when provided', () => {
      renderReceipt({ transactionHash: '0xdeadbeef' });
      expect(screen.getByText('0xdeadbeef')).toBeInTheDocument();
    });

    it('renders explorer URL when provided', () => {
      renderReceipt({ explorerUrl: 'https://explorer.example.com/tx/123' });
      expect(screen.getByText('https://explorer.example.com/tx/123')).toBeInTheDocument();
    });

    it('renders memo when provided', () => {
      renderReceipt({ memo: 'Invoice #42' });
      expect(screen.getByText('Invoice #42')).toBeInTheDocument();
    });

    it('does not render memo when not provided', () => {
      renderReceipt();
      expect(screen.queryByText('Memo')).not.toBeInTheDocument();
    });

    it('renders default issuer name "Revora" when not provided', () => {
      renderReceipt({ issuerName: undefined });
      expect(screen.getByText('Revora')).toBeInTheDocument();
    });

    it('renders numeric amount with locale formatting', () => {
      renderReceipt({ amount: 1500, currency: 'USD' });
      expect(screen.getByText('1,500 USD')).toBeInTheDocument();
    });

    it('matches snapshot for compact layout', () => {
      const { container } = renderReceipt();
      expect(container).toMatchSnapshot();
    });
  });

  /* ── Status variants ──────────────────────────────────────── */

  describe('status variants', () => {
    it('renders COMPLETED with correct status class', () => {
      renderReceipt({ status: 'completed' });
      expect(screen.getByText('COMPLETED').className).toContain('tx-status-completed');
    });

    it('renders PENDING with correct status class', () => {
      renderReceipt({ status: 'pending' });
      expect(screen.getByText('PENDING').className).toContain('tx-status-pending');
    });

    it('renders FAILED with correct status class', () => {
      renderReceipt({ status: 'failed' });
      expect(screen.getByText('FAILED').className).toContain('tx-status-failed');
    });
  });

  /* ── Hide amount toggle ───────────────────────────────────── */

  describe('hide amount toggle', () => {
    it('hides and shows amount on toggle click', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderReceipt();
      expect(screen.getByText('1,500.00 USDC')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /hide amount/i }));

      expect(screen.queryByText('1,500.00 USDC')).not.toBeInTheDocument();
      expect(screen.getByText('••••••')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /show amount/i }));

      expect(screen.getByText('1,500.00 USDC')).toBeInTheDocument();
    });

    it('has aria-pressed reflecting toggle state', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderReceipt();
      const btn = screen.getByRole('button', { name: /hide amount/i });
      expect(btn).toHaveAttribute('aria-pressed', 'false');

      await user.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  /* ── Aspect ratios ────────────────────────────────────────── */

  describe('aspect ratios', () => {
    it('defaults to compact aspect ratio', () => {
      renderReceipt();
      expect(screen.getByTestId('tx-receipt-card').className).toContain('tx-receipt-card--compact');
    });

    it('switches to square aspect ratio', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderReceipt();
      const squareBtn = screen.getByRole('button', { name: /square/i });
      await user.click(squareBtn);

      expect(screen.getByTestId('tx-receipt-card').className).toContain('tx-receipt-card--square');
      expect(squareBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('switches to wide aspect ratio', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderReceipt();
      const wideBtn = screen.getByRole('button', { name: /wide/i });
      await user.click(wideBtn);

      expect(screen.getByTestId('tx-receipt-card').className).toContain('tx-receipt-card--wide');
      expect(wideBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('only one aspect ratio is active at a time', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderReceipt();
      const compactBtn = screen.getByRole('button', { name: /compact card/i });
      const squareBtn = screen.getByRole('button', { name: /square/i });
      const wideBtn = screen.getByRole('button', { name: /wide/i });

      expect(compactBtn).toHaveAttribute('aria-pressed', 'true');
      expect(squareBtn).toHaveAttribute('aria-pressed', 'false');
      expect(wideBtn).toHaveAttribute('aria-pressed', 'false');

      await user.click(squareBtn);
      expect(compactBtn).toHaveAttribute('aria-pressed', 'false');
      expect(squareBtn).toHaveAttribute('aria-pressed', 'true');

      await user.click(wideBtn);
      expect(wideBtn).toHaveAttribute('aria-pressed', 'true');
      expect(squareBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  /* ── Download ─────────────────────────────────────────────── */

  describe('download', () => {
    it('generates image and triggers download', async () => {
      renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
      
      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(html2canvas).toHaveBeenCalled();
      expect(mockAnchorClick).toHaveBeenCalled();
    });

    it('shows toast on successful download', async () => {
      renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
      
      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Receipt image downloaded');
    });

    it('disables buttons while capturing', async () => {
      renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });

      fireEvent.click(downloadBtn);

      // Assert intermediate disabled state after synchronous state update
      expect(downloadBtn).toBeDisabled();
      expect(copyBtn).toBeDisabled();

      // Flush the capture process
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(downloadBtn).not.toBeDisabled();
    });    it('handles html2canvas failure gracefully', async () => {
      (html2canvas as unknown as vi.Mock).mockRejectedValueOnce(new Error('Canvas error'));
      renderReceipt();

      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });

      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Failed to download');
    });

    it('handles null canvas from capture (download)', async () => {
      (html2canvas as unknown as vi.Mock).mockResolvedValueOnce(null);
      renderReceipt();

      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });

      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Could not capture receipt');
      expect(toast.className).toContain('tx-toast--error');
    });
  });

  /* ── Copy image ───────────────────────────────────────────── */

  describe('copy image', () => {
    it('copies image to clipboard via ClipboardItem', async () => {
      mockClipboardWrite.mockResolvedValueOnce(undefined);
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });
      
      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(html2canvas).toHaveBeenCalled();
      expect(window.ClipboardItem).toHaveBeenCalled();
      expect(mockClipboardWrite).toHaveBeenCalled();
    });

    it('shows success toast on clipboard copy', async () => {
      mockClipboardWrite.mockResolvedValueOnce(undefined);
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });
      
      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Receipt image copied');
    });

    it('falls back to download when clipboard.write fails', async () => {
      mockClipboardWrite.mockRejectedValueOnce(new Error('Clipboard unavailable'));
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });
      
      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockClipboardWrite).toHaveBeenCalled();
      expect(mockAnchorClick).toHaveBeenCalled();
      const toast = screen.getByTestId('tx-toast');
      expect(toast.textContent).toContain('Clipboard unavailable');
    });

    it('falls back to download when ClipboardItem is not available', async () => {
      vi.stubGlobal('ClipboardItem', undefined);

      renderReceipt();
      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });

      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockAnchorClick).toHaveBeenCalled();
    });

    it('handles null canvas from capture (copy)', async () => {
      (html2canvas as unknown as vi.Mock).mockResolvedValueOnce(null);
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });

      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Could not capture receipt');
    });

    it('handles null blob from canvasToBlob (copy)', async () => {
      const nullBlobCanvas = {
        toBlob: vi.fn().mockImplementation((cb: (blob: null) => void) => cb(null)),
        toDataURL: vi.fn(),
      };
      (html2canvas as unknown as vi.Mock).mockResolvedValueOnce(nullBlobCanvas);
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });

      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Failed to generate receipt image');
    });

    it('handles html2canvas throw during copy', async () => {
      (html2canvas as unknown as vi.Mock).mockRejectedValueOnce(new Error('Canvas error'));
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });

      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toContain('Failed to copy receipt image');
    });
  });

  /* ── Toast ────────────────────────────────────────────────── */

  describe('toast notifications', () => {
    it('auto-dismisses toast after 4 seconds', async () => {
      renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
      
      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('tx-toast')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(4000);
      });

      expect(screen.queryByTestId('tx-toast')).not.toBeInTheDocument();
    });

    it('dismisses toast on close button click', async () => {
      renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
      
      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const dismissBtn = screen.getByRole('button', { name: /dismiss notification/i });
      
      fireEvent.click(dismissBtn);

      expect(screen.queryByTestId('tx-toast')).not.toBeInTheDocument();
    });

    it('toast has role="status" and aria-live="polite"', async () => {
      renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
      
      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast).toHaveAttribute('role', 'status');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });    it('shows error toast variant', async () => {
      (html2canvas as unknown as vi.Mock).mockRejectedValueOnce(new Error('fail'));
      renderReceipt();

      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });

      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('tx-toast').className).toContain('tx-toast--error');
    });

    it('shows info toast variant for clipboard fallback', async () => {
      mockClipboardWrite.mockRejectedValueOnce(new Error('fail'));
      renderReceipt();

      const copyBtn = screen.getByRole('button', { name: /copy receipt/i });

      fireEvent.click(copyBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const toast = screen.getByTestId('tx-toast');
      expect(toast.className).toContain('tx-toast--info');
    });

    it('cleans up toast timer on unmount without errors', async () => {
      const { unmount } = renderReceipt();
      const downloadBtn = screen.getByRole('button', { name: /download receipt/i });

      fireEvent.click(downloadBtn);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('tx-toast')).toBeInTheDocument();

      // Unmount while toast is active
      unmount();

      // Timer advancement should not throw (cleanup hook ran)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // No errors expected — component unmounted cleanly
    });
  });

  /* ── Sensitive fields ─────────────────────────────────────── */

  describe('sensitive fields', () => {
    it('sender wallet is marked as unselectable', () => {
      renderReceipt();
      expect(screen.getByText(DEFAULT_PROPS.senderWallet).className).toContain('tx-unselectable');
    });

    it('recipient wallet is marked as unselectable', () => {
      renderReceipt();
      expect(screen.getByText(DEFAULT_PROPS.recipientWallet).className).toContain('tx-unselectable');
    });

    it('sensitive fields have data-sensitive attribute', () => {
      renderReceipt();
      expect(document.querySelectorAll('[data-sensitive="true"]').length).toBe(2);
    });

    it('sensitive row labels include shield icon', () => {
      renderReceipt();
      expect(screen.getByTestId('tx-receipt-card').querySelectorAll('.tx-sensitive-icon').length).toBe(2);
    });
  });

  /* ── Accessibility ────────────────────────────────────────── */

  describe('accessibility', () => {
    it('has no axe violations in default state', async () => {
      const { container } = renderReceipt();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with amount hidden', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderReceipt();
      await user.click(screen.getByRole('button', { name: /hide amount/i }));
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations in square aspect ratio', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderReceipt();
      await user.click(screen.getByRole('button', { name: /square/i }));
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations in wide aspect ratio', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderReceipt();
      await user.click(screen.getByRole('button', { name: /wide/i }));
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with toast visible', async () => {
      const { container } = renderReceipt();
      
      fireEvent.click(screen.getByRole('button', { name: /download receipt/i }));
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(await axe(container)).toHaveNoViolations();
    });

    it('aspect ratio buttons are in a fieldset', () => {
      renderReceipt();
      expect(screen.getByRole('group', { name: /aspect ratio/i })).toBeInTheDocument();
    });

    it('control bar has toolbar role', () => {
      renderReceipt();
      expect(screen.getByRole('toolbar', { name: /receipt sharing/i })).toBeInTheDocument();
    });

    it('receipt card has region role', () => {
      renderReceipt();
      expect(screen.getByRole('region', { name: /transaction receipt details/i })).toBeInTheDocument();
    });

    it('live region has correct ARIA attributes', () => {
      renderReceipt();
      const lr = screen.getByTestId('tx-live-region');
      expect(lr).toHaveAttribute('aria-live', 'polite');
      expect(lr).toHaveAttribute('role', 'status');
    });

    it('buttons have accessible names', () => {
      renderReceipt();
      for (const name of ['Hide amount', 'Copy receipt image to clipboard', 'Download receipt as image', 'Compact card', 'Square (1:1)', 'Wide banner (16:9)']) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      }
    });
  });

  /* ── RTL support ──────────────────────────────────────────── */

  describe('RTL support', () => {
    it('renders correctly in RTL mode', () => {
      render(
        <div dir="rtl">
          <TransactionReceiptShare {...DEFAULT_PROPS} />
        </div>,
      );
      expect(screen.getByTestId('tx-receipt-share')).toBeInTheDocument();
      expect(screen.getByTestId('tx-receipt-card')).toBeInTheDocument();
    });

    it('has no axe violations in RTL', async () => {
      const { container } = render(
        <div dir="rtl">
          <TransactionReceiptShare {...DEFAULT_PROPS} />
        </div>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('all functionality works in RTL mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <div dir="rtl">
          <TransactionReceiptShare {...DEFAULT_PROPS} />
        </div>,
      );

      await user.click(screen.getByRole('button', { name: /hide amount/i }));
      expect(screen.getByText('••••••')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /wide/i }));
      expect(screen.getByTestId('tx-receipt-card').className).toContain('tx-receipt-card--wide');
    });
  });

  /* ── Edge cases ───────────────────────────────────────────── */

  describe('edge cases', () => {
    it('handles very long wallet addresses', () => {
      const longWallet = '0x' + 'a'.repeat(64);
      renderReceipt({ senderWallet: longWallet });
      expect(screen.getByText(longWallet)).toBeInTheDocument();
    });

    it('handles very long transaction IDs', () => {
      const longTxId = 'TX-' + 'x'.repeat(100);
      renderReceipt({ transactionId: longTxId });
      expect(screen.getByText(longTxId)).toBeInTheDocument();
    });

    it('handles empty memo gracefully', () => {
      renderReceipt({ memo: '' });
      expect(screen.queryByText('Memo')).not.toBeInTheDocument();
    });

    it('handles all status values', () => {
      const { rerender } = renderReceipt({ status: 'completed' });
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();

      rerender(<TransactionReceiptShare {...DEFAULT_PROPS} status="pending" />);
      expect(screen.getByText('PENDING')).toBeInTheDocument();

      rerender(<TransactionReceiptShare {...DEFAULT_PROPS} status="failed" />);
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });

    it('renders transaction hash in footer', () => {
      renderReceipt({ transactionHash: '0xhashfooter' });
      expect(screen.getByTestId('tx-receipt-card').textContent).toContain('0xhashfooter');
    });
  });

  /* ── Snapshots ────────────────────────────────────────────── */

  describe('snapshots', () => {
    it('compact layout', () => {
      expect(renderReceipt().container).toMatchSnapshot();
    });

    it('square layout', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderReceipt();
      await user.click(screen.getByRole('button', { name: /square/i }));
      expect(container).toMatchSnapshot();
    });

    it('wide layout', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderReceipt();
      await user.click(screen.getByRole('button', { name: /wide/i }));
      expect(container).toMatchSnapshot();
    });

    it('hidden amount', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderReceipt();
      await user.click(screen.getByRole('button', { name: /hide amount/i }));
      expect(container).toMatchSnapshot();
    });

    it('all optional fields', () => {
      const { container } = renderReceipt({
        issuerName: 'AcmeCorp',
        issuerLogoUrl: 'https://example.com/logo.png',
        transactionHash: '0xabcdef',
        explorerUrl: 'https://explorer.example.com/tx/abc',
        memo: 'Payment for invoice #42',
      });
      expect(container).toMatchSnapshot();
    });
  });
});
