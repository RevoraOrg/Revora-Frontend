/**
 * TransactionReceiptShare — Issue #481
 *
 * A share-as-image affordance that generates a compact receipt image
 * with issuer branding for sharing via chat or social media.
 *
 * Features
 * ─────────
 * - Aspect-ratio selector: compact, square (1:1), wide (16:9)
 * - Hide-amount privacy toggle (excluded from generated image)
 * - Copy-image to clipboard with fallback to download
 * - Download as PNG (2x resolution for retina)
 * - Sensitive fields (sender/recipient wallet) cannot be text-selected
 * - WCAG 2.1 AA: proper roles, live regions, focus management, keyboard nav
 * - Responsive: stacks on narrow viewports
 * - RTL: logical CSS properties throughout
 * - Reduced-motion: no forced animations
 * - Forced-colors: explicit borders preserved
 */

import React, { useRef, useState, useCallback, useId, useEffect } from 'react';
import { Download, Copy, Eye, EyeOff, ShieldCheck, Image, Square, RectangleHorizontal, CheckCircle2, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import './TransactionReceiptShare.css';

/* ─── Types ─────────────────────────────────────────────────── */

export type ReceiptAspectRatio = 'compact' | 'square' | 'wide';

export interface TransactionReceiptShareProps {
  /** Issuer display name (shown in header) */
  issuerName?: string;
  /** Optional issuer logo URL for branding */
  issuerLogoUrl?: string;
  /** Unique transaction identifier */
  transactionId: string;
  /** Optional block-explorer URL */
  explorerUrl?: string;
  /** On-chain transaction hash (optional) */
  transactionHash?: string;
  /** Formatted date string, e.g. "Oct 24, 2023 14:30" */
  date: string;
  /** Transaction amount (raw number or formatted string) */
  amount: number | string;
  /** Currency symbol or code, e.g. "USDC" */
  currency: string;
  /** Current transaction status */
  status: 'completed' | 'pending' | 'failed';
  /** Sender wallet address (copy-disabled in the image) */
  senderWallet: string;
  /** Recipient wallet address (copy-disabled in the image) */
  recipientWallet: string;
  /** Optional memo / note field */
  memo?: string;
}

/* ─── Constants ────────────────────────────────────────────── */

const ASPECT_LABELS: Record<ReceiptAspectRatio, string> = {
  compact: 'Compact card',
  square: 'Square (1:1)',
  wide: 'Wide banner (16:9)',
};

/* ─── Toast sub-component ──────────────────────────────────── */

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, variant = 'success', onDismiss }) => {
  const icon =
    variant === 'success' ? (
      <CheckCircle2 size={16} aria-hidden="true" />
    ) : variant === 'error' ? (
      <X size={16} aria-hidden="true" />
    ) : null;

  return (
    <div
      className={`tx-toast tx-toast--${variant}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="tx-toast"
    >
      <span className="tx-toast-content">
        {icon}
        <span>{message}</span>
      </span>
      <button
        type="button"
        className="tx-toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

/* ─── Main Component ───────────────────────────────────────── */

export const TransactionReceiptShare: React.FC<TransactionReceiptShareProps> = ({
  issuerName = 'Revora',
  issuerLogoUrl,
  transactionId,
  transactionHash,
  explorerUrl,
  date,
  amount,
  currency,
  status,
  senderWallet,
  recipientWallet,
  memo,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const liveRegionId = useId();

  const [hideAmount, setHideAmount] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ReceiptAspectRatio>('compact');
  const [isCapturing, setIsCapturing] = useState(false);

  // Toast state with cleanup on unmount
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback(
    (message: string, variant: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, variant });
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  /* ── Capture helper ──────────────────────────────────────── */

  const captureReceipt = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    // Use double rAF to ensure React flushes all pending state updates to the DOM
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    return html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      useCORS: true,
    });
  }, []);

  /* ── Download ────────────────────────────────────────────── */

  const handleDownload = useCallback(async () => {
    try {
      setIsCapturing(true);
      const canvas = await captureReceipt();
      if (!canvas) {
        showToast('Could not capture receipt. Please try again.', 'error');
        setIsCapturing(false);
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `receipt-${transactionId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Receipt image downloaded.', 'success');
    } catch (err) {
      console.error('Failed to generate image', err);
      showToast('Failed to download receipt image.', 'error');
    } finally {
      setIsCapturing(false);
    }
  }, [captureReceipt, transactionId, showToast]);

  /* ── Copy image to clipboard ─────────────────────────────── */

  /** Promisify canvas.toBlob for proper async flow control */
  const canvasToBlob = useCallback(
    (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> =>
      new Promise((resolve) => canvas.toBlob(resolve, type, quality)),
    [],
  );

  const handleCopyImage = useCallback(async () => {
    try {
      setIsCapturing(true);
      const canvas = await captureReceipt();
      if (!canvas) {
        showToast('Could not capture receipt. Please try again.', 'error');
        setIsCapturing(false);
        return;
      }

      const blob = await canvasToBlob(canvas, 'image/png');
      if (!blob) {
        showToast('Failed to generate receipt image.', 'error');
        setIsCapturing(false);
        return;
      }

      // Try Clipboard API first
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showToast('Receipt image copied to clipboard.', 'success');
          return;
        } catch (clipboardErr) {
          console.error('Clipboard write failed, falling back to download', clipboardErr);
        }
      }

      // Fallback: download the image
      const dataUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `receipt-${transactionId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Clipboard unavailable. Image downloaded instead.', 'info');
    } catch (err) {
      console.error('Failed to generate image', err);
      showToast('Failed to copy receipt image.', 'error');
    } finally {
      setIsCapturing(false);
    }
  }, [captureReceipt, canvasToBlob, transactionId, showToast]);

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="tx-receipt-container" data-testid="tx-receipt-share">
      {/* Hidden live region for screen-reader announcements */}
      <div
        id={liveRegionId}
        className="tx-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="tx-live-region"
      >
        {toast?.message ?? ''}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={dismissToast}
        />
      )}

      {/* ── Control bar ── */}
      <div className="tx-receipt-controls" role="toolbar" aria-label="Receipt sharing controls">
        {/* Aspect ratio picker */}
        <fieldset className="tx-aspect-ratio-group" aria-label="Aspect ratio">
          <legend className="tx-sr-only">Aspect ratio</legend>
          {(['compact', 'square', 'wide'] as ReceiptAspectRatio[]).map((ratio) => {
            const Icon = ratio === 'compact' ? Image : ratio === 'square' ? Square : RectangleHorizontal;
            return (
              <button
                key={ratio}
                type="button"
                className={`tx-aspect-btn ${aspectRatio === ratio ? 'tx-aspect-btn--active' : ''}`}
                onClick={() => setAspectRatio(ratio)}
                aria-pressed={aspectRatio === ratio}
                aria-label={ASPECT_LABELS[ratio]}
                title={ASPECT_LABELS[ratio]}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="tx-aspect-label">{ASPECT_LABELS[ratio]}</span>
              </button>
            );
          })}
        </fieldset>

        <div className="tx-action-group">
          {/* Hide amount toggle */}
          <button
            type="button"
            className="tx-action-btn"
            onClick={() => setHideAmount((prev) => !prev)}
            aria-label={hideAmount ? 'Show amount' : 'Hide amount'}
            aria-pressed={hideAmount}
          >
            {hideAmount ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            <span className="tx-action-text">{hideAmount ? 'Show' : 'Hide'}</span>
          </button>

          {/* Copy image */}
          <button
            type="button"
            className="tx-action-btn"
            onClick={handleCopyImage}
            disabled={isCapturing}
            aria-label={isCapturing ? 'Generating receipt image…' : 'Copy receipt image to clipboard'}
            aria-busy={isCapturing}
          >
            <Copy size={16} aria-hidden="true" />
            <span className="tx-action-text">Copy</span>
          </button>

          {/* Download */}
          <button
            type="button"
            className="tx-action-btn tx-action-btn--primary"
            onClick={handleDownload}
            disabled={isCapturing}
            aria-label={isCapturing ? 'Generating receipt image…' : 'Download receipt as image'}
            aria-busy={isCapturing}
          >
            <Download size={16} aria-hidden="true" />
            <span className="tx-action-text">Download</span>
          </button>
        </div>
      </div>

      {/* ── Capturable receipt card ── */}
      <div
        className={`tx-receipt-card tx-receipt-card--${aspectRatio} ${isCapturing ? 'tx-receipt-card--capturing' : ''}`}
        ref={receiptRef}
        aria-label="Transaction receipt details"
        role="region"
        data-testid="tx-receipt-card"
      >
        {/* Header — issuer branding */}
        <div className="tx-receipt-header">
          <div className="tx-receipt-brand">
            {issuerLogoUrl && (
              <img
                src={issuerLogoUrl}
                alt={`${issuerName} logo`}
                className="tx-brand-logo"
                crossOrigin="anonymous"
              />
            )}
            <span className="tx-brand-name">{issuerName}</span>
          </div>
          <ShieldCheck size={20} className="tx-verified-icon" aria-hidden="true" />
        </div>

        {/* Amount section */}
        <div className="tx-receipt-amount-section">
          <div className="tx-receipt-label">Amount</div>
          <div className="tx-receipt-amount">
            {hideAmount ? (
              <>
                <span className="tx-amount-hidden" aria-label="Amount hidden for privacy">••••••</span>
                <div className="tx-privacy-badge" aria-hidden="true">Hidden for privacy</div>
              </>
            ) : (
              <span>
                {typeof amount === 'number' ? amount.toLocaleString() : amount} {currency}
              </span>
            )}
          </div>
        </div>

        {/* Detail rows */}
        <div className="tx-receipt-details">
          <div className="tx-detail-row">
            <span className="tx-detail-label">Status</span>
            <span className={`tx-detail-value tx-status-${status}`}>
              {status.toUpperCase()}
            </span>
          </div>
          <div className="tx-detail-row">
            <span className="tx-detail-label">Date</span>
            <span className="tx-detail-value">{date}</span>
          </div>
          <div className="tx-detail-row">
            <span className="tx-detail-label">Transaction ID</span>
            <span className="tx-detail-value">{transactionId}</span>
          </div>
          {transactionHash && (
            <div className="tx-detail-row">
              <span className="tx-detail-label">Hash</span>
              <span className="tx-detail-value tx-mono">{transactionHash}</span>
            </div>
          )}
          {memo && (
            <div className="tx-detail-row">
              <span className="tx-detail-label">Memo</span>
              <span className="tx-detail-value">{memo}</span>
            </div>
          )}
          {/* Sensitive: sender wallet (copy disabled) */}
          <div className="tx-detail-row tx-sensitive-row">
            <span className="tx-detail-label">
              From
              <span className="tx-sensitive-icon" title="Copy disabled for security">
                <ShieldCheck size={10} aria-hidden="true" />
              </span>
            </span>
            <span
              className="tx-detail-value tx-unselectable"
              aria-label={`Sender wallet: ${senderWallet}. Copy disabled for security.`}
              data-sensitive="true"
            >
              {senderWallet}
            </span>
          </div>
          {/* Sensitive: recipient wallet (copy disabled) */}
          <div className="tx-detail-row tx-sensitive-row">
            <span className="tx-detail-label">
              To
              <span className="tx-sensitive-icon" title="Copy disabled for security">
                <ShieldCheck size={10} aria-hidden="true" />
              </span>
            </span>
            <span
              className="tx-detail-value tx-unselectable"
              aria-label={`Recipient wallet: ${recipientWallet}. Copy disabled for security.`}
              data-sensitive="true"
            >
              {recipientWallet}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="tx-receipt-footer">
          <div>Generated securely by {issuerName}</div>
          {explorerUrl && (
            <div className="tx-explorer-link">
              Explorer:{' '}
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                {explorerUrl}
              </a>
            </div>
          )}
          {transactionHash && (
            <div className="tx-footer-hash">Hash: {transactionHash}</div>
          )}
        </div>
      </div>
    </div>
  );
};

TransactionReceiptShare.displayName = 'TransactionReceiptShare';
export default TransactionReceiptShare;
