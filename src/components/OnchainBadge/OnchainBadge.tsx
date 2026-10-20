import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  formatBlockNumber,
  formatConfirmations,
  formatTimeSince,
  resolveExplorerUrl,
  type StellarExplorerNetwork,
} from '../StatusTimeline/onChainMetadataUtils';
import './OnchainBadge.css';

export type OnchainBadgeVariant =
  | 'pending'
  | 'retrying'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'reorged';

export interface OnchainBadgeMetadata {
  /** Ledger sequence / block height shown in the confirmation tooltip. */
  blockNumber?: number | string;
  /** ISO timestamp of confirmation, shown as a relative "time since". */
  confirmedAt?: string;
  /** Network segment used for the default Stellar Expert explorer URL. */
  network?: StellarExplorerNetwork;
}

export interface OnchainBadgeProps {
  variant: OnchainBadgeVariant;
  currentConfirmations?: number;
  targetConfirmations?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Full transaction hash; used to resolve the default explorer link. */
  transactionHash?: string;
  /** Overrides the default Stellar Expert explorer URL in the tooltip. */
  explorerUrl?: string;
  /** Optional ledger metadata surfaced in the confirmation tooltip. */
  metadata?: OnchainBadgeMetadata;
  /** Set false to suppress the confirmation tooltip. Default true. */
  showTooltip?: boolean;
}

function getAriaLabel(
  variant: OnchainBadgeVariant,
  current?: number,
  target?: number,
): string {
  switch (variant) {
    case 'pending':
      return 'Transaction pending - waiting for network confirmation';
    case 'retrying':
      return 'Transaction retrying - attempting to resubmit to the network';
    case 'confirming':
      return `Transaction confirming - ${current ?? 0} of ${target ?? 0} confirmations received`;
    case 'confirmed':
      return `Transaction confirmed with ${current ?? 0} of ${target ?? 0} confirmations`;
    case 'failed':
      return 'Transaction failed - the on-chain operation did not succeed';
    case 'reorged':
      return 'Transaction reorged - removed from the chain by a chain reorganization';
  }
}

function getIcon(variant: OnchainBadgeVariant, size: number) {
  const common = { size, 'aria-hidden': true as const };
  switch (variant) {
    case 'pending':
      return <Clock {...common} />;
    case 'retrying':
      return <RefreshCw {...common} />;
    case 'confirming':
      return <ArrowUpCircle {...common} />;
    case 'confirmed':
      return <CheckCircle2 {...common} />;
    case 'failed':
      return <XCircle {...common} />;
    case 'reorged':
      return <RotateCcw {...common} />;
  }
}

function Counter({
  value,
  reduced,
}: {
  value: number;
  reduced: boolean;
}) {
  const [displayed, setDisplayed] = useState(reduced ? value : 0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setDisplayed(value);
      return;
    }

    const DURATION = 800;
    const from = 0;
    startRef.current = 0;

    function animate(timestamp: number) {
      if (startRef.current === 0) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, reduced]);

  return (
    <span className="ob-counter" aria-hidden="true">
      {displayed}
    </span>
  );
}

const SIZE_ICON_MAP = { sm: 12, md: 14, lg: 18 } as const;

function hasTooltipableMetadata(
  metadata: OnchainBadgeMetadata | undefined,
  transactionHash: string,
  explorerUrl: string,
): boolean {
  return (
    (metadata?.blockNumber !== undefined &&
      metadata?.blockNumber !== null &&
      String(metadata.blockNumber).trim() !== '') ||
    Boolean(metadata?.confirmedAt) ||
    Boolean(transactionHash.trim()) ||
    Boolean(explorerUrl.trim())
  );
}

/**
 * OnchainBadge — compact on-chain status pill.
 *
 * Every state is expressed with a paired icon + text label so colour is never
 * the only cue (WCAG 2.1). When on-chain metadata is available, an accessible
 * confirmation tooltip (block, confirmations, time since, explorer link) opens
 * on hover and keyboard focus, and is dismissible via Escape.
 */
export const OnchainBadge: React.FC<OnchainBadgeProps> = ({
  variant,
  currentConfirmations = 0,
  targetConfirmations = 0,
  size = 'md',
  className = '',
  transactionHash = '',
  explorerUrl = '',
  metadata,
  showTooltip = true,
}) => {
  const reducedMotion = useReducedMotion();
  const tooltipId = useId();
  const label = getAriaLabel(variant, currentConfirmations, targetConfirmations);
  const iconSize = SIZE_ICON_MAP[size];
  const showCounter = variant === 'confirming' || variant === 'confirmed';

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const hasMeta = showTooltip && hasTooltipableMetadata(metadata, transactionHash, explorerUrl);

  const tooltipVisible = hasMeta && open && !dismissed;
  const explorerLink = hasMeta
    ? resolveExplorerUrl({
        transactionHash,
        explorerUrl,
        network: metadata?.network,
      })
    : undefined;

  const openTip = useCallback(() => {
    if (!dismissed) setOpen(true);
  }, [dismissed]);

  const closeTip = useCallback(() => {
    setOpen(false);
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissed(false);
  }, []);

  useEffect(() => {
    if (!tooltipVisible) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setDismissed(true);
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tooltipVisible]);

  const hasBlock =
    metadata?.blockNumber !== undefined &&
    metadata?.blockNumber !== null &&
    String(metadata.blockNumber).trim() !== '';

  return (
    <span
      className={`onchain-badge onchain-badge--${variant} onchain-badge--${size}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
      aria-describedby={hasMeta ? tooltipId : undefined}
      tabIndex={hasMeta ? 0 : undefined}
      onMouseEnter={hasMeta ? openTip : undefined}
      onMouseLeave={
        hasMeta
          ? () => {
              closeTip();
              clearDismissed();
            }
          : undefined
      }
      onFocus={hasMeta ? openTip : undefined}
      onBlur={
        hasMeta
          ? () => {
              closeTip();
              clearDismissed();
            }
          : undefined
      }
      data-testid={`onchain-badge-${variant}`}
    >
      <span className="ob-icon">{getIcon(variant, iconSize)}</span>
      <span className="ob-label">
        {variant === 'pending' && 'Pending'}
        {variant === 'retrying' && 'Retrying'}
        {variant === 'confirming' && 'Confirming'}
        {variant === 'confirmed' && 'Confirmed'}
        {variant === 'failed' && 'Failed'}
        {variant === 'reorged' && 'Reorged'}
      </span>
      {showCounter && (
        <>
          <span className="ob-separator" aria-hidden="true">·</span>
          <Counter value={currentConfirmations} reduced={reducedMotion} />
          <span className="ob-target" aria-hidden="true">
            /{targetConfirmations}
          </span>
        </>
      )}

      {hasMeta && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`ob-tooltip${tooltipVisible ? ' ob-tooltip--open' : ''}`}
          data-testid="onchain-badge-tooltip"
        >
          <div className="ob-tooltip-grid">
            {hasBlock && (
              <>
                <span className="ob-tooltip-label">Block</span>
                <span
                  className="ob-tooltip-value"
                  data-testid="ob-tooltip-block"
                >
                  {formatBlockNumber(metadata?.blockNumber)}
                </span>
              </>
            )}
            <span className="ob-tooltip-label">Confirmations</span>
            <span
              className="ob-tooltip-value"
              data-testid="ob-tooltip-confirmations"
            >
              {formatConfirmations(currentConfirmations)} / {formatConfirmations(targetConfirmations)}
            </span>
            {metadata?.confirmedAt && (
              <>
                <span className="ob-tooltip-label">Time since</span>
                <span
                  className="ob-tooltip-value"
                  data-testid="ob-tooltip-time"
                >
                  {formatTimeSince(metadata.confirmedAt)}
                </span>
              </>
            )}
          </div>
          {tooltipVisible && explorerLink && (
            <a
              className="ob-tooltip-link"
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="ob-tooltip-explorer"
            >
              Open in explorer
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
          {tooltipVisible && !explorerLink && (
            <span
              className="ob-tooltip-link ob-tooltip-link--disabled"
              aria-disabled="true"
            >
              Explorer link unavailable
            </span>
          )}
        </div>
      )}
    </span>
  );
};

OnchainBadge.displayName = 'OnchainBadge';

export default OnchainBadge;