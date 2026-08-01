import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, RefreshCw, CheckCircle2, ArrowUpCircle, Copy, ExternalLink } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './OnchainBadge.css';

export type OnchainBadgeVariant = 'pending' | 'retrying' | 'confirming' | 'confirmed';

export type PendingSubStatus = 'submitted' | 'speed_up' | 'replacing';
export type RetryingSubStatus = 'attempt_1' | 'attempt_2' | 'attempt_max' | 'manual';
export type ConfirmedSubStatus = 'partial' | 'enough' | 'finalized' | 'reverted';

export interface OnchainBadgeProps {
  variant: OnchainBadgeVariant;
  currentConfirmations?: number;
  targetConfirmations?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Sub-status for enhanced state visibility */
  subStatus?: PendingSubStatus | RetryingSubStatus | ConfirmedSubStatus;
  /** Retry attempt number (1-based) */
  retryAttempt?: number;
  /** Max retry attempts */
  maxRetries?: number;
  /** Transaction hash for copy-on-click */
  txHash?: string;
  /** Click handler (e.g., navigate to block explorer) */
  onClick?: () => void;
  /** Show progress bar instead of counter (for Ledger table) */
  progressBar?: boolean;
}

function getAriaLabel(
  variant: OnchainBadgeVariant,
  current?: number,
  target?: number,
  subStatus?: string,
  retryAttempt?: number,
  maxRetries?: number,
): string {
  const sub = subStatus ? ` (${subStatus.replace(/_/g, ' ')})` : '';
  switch (variant) {
    case 'pending':
      return `Transaction pending${sub} - waiting for network confirmation`;
    case 'retrying': {
      const attempt = retryAttempt && maxRetries ? ` - attempt ${retryAttempt}/${maxRetries}` : '';
      return `Transaction retrying${sub}${attempt} - attempting to resubmit to the network`;
    }
    case 'confirming':
      return `Transaction confirming${sub} - ${current ?? 0} of ${target ?? 0} confirmations received`;
    case 'confirmed': {
      if (subStatus === 'reverted') return 'Transaction reverted - block reorganization detected';
      return `Transaction confirmed${sub} with ${current ?? 0} of ${target ?? 0} confirmations`;
    }
  }
}

function getLabel(
  variant: OnchainBadgeVariant,
  subStatus?: string,
  retryAttempt?: number,
  maxRetries?: number,
): string {
  switch (variant) {
    case 'pending': {
      if (subStatus === 'speed_up') return 'Speeding up';
      if (subStatus === 'replacing') return 'Replacing';
      return 'Pending';
    }
    case 'retrying': {
      if (retryAttempt && maxRetries) return `Retrying ${retryAttempt}/${maxRetries}`;
      return 'Retrying';
    }
    case 'confirming':
      return 'Confirming';
    case 'confirmed': {
      if (subStatus === 'reverted') return 'Reverted';
      if (subStatus === 'finalized') return 'Finalized';
      return 'Confirmed';
    }
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

function ProgressBar({
  current,
  target,
  reduced,
}: {
  current: number;
  target: number;
  reduced: boolean;
}) {
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const [displayedRatio, setDisplayedRatio] = useState(reduced ? ratio : 0);

  useEffect(() => {
    if (reduced) {
      setDisplayedRatio(ratio);
      return;
    }
    const timer = setTimeout(() => setDisplayedRatio(ratio), 50);
    return () => clearTimeout(timer);
  }, [ratio, reduced]);

  return (
    <span className="ob-progress" aria-hidden="true">
      <span className="ob-progress-track">
        <span
          className="ob-progress-fill"
          style={{
            width: `${displayedRatio * 100}%`,
            transition: reduced ? 'none' : 'width 0.6s ease-out',
          }}
        />
      </span>
      <span className="ob-progress-label">
        {current}/{target}
      </span>
    </span>
  );
}

function TxHashButton({ txHash, onClick }: { txHash: string; onClick?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(txHash).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      } else {
        // Fallback for jsdom/test environments
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [txHash],
  );

  const truncated = txHash.length > 12
    ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
    : txHash;

  return (
    <span className="ob-txhash">
      <button
        type="button"
        className="ob-txhash-btn"
        onClick={handleCopy}
        title={`Copy ${txHash}`}
        aria-label={`Copy transaction hash ${txHash}`}
      >
        {copied ? (
          <>
            <CheckCircle2 size={10} aria-hidden="true" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <span className="ob-txhash-text">{truncated}</span>
            <Copy size={10} aria-hidden="true" />
          </>
        )}
      </button>
      {onClick && (
        <button
          type="button"
          className="ob-explorer-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          title="View on block explorer"
          aria-label="View transaction on block explorer"
        >
          <ExternalLink size={10} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

const SIZE_ICON_MAP = { sm: 12, md: 14, lg: 18 } as const;

function getIcon(variant: OnchainBadgeVariant, size: number, subStatus?: string) {
  const common = { size, 'aria-hidden': true as const };
  // Reverted status uses red X icon
  if (variant === 'confirmed' && subStatus === 'reverted') {
    return <RefreshCw {...common} />;
  }
  switch (variant) {
    case 'pending':
      return <Clock {...common} />;
    case 'retrying':
      return <RefreshCw {...common} />;
    case 'confirming':
      return <ArrowUpCircle {...common} />;
    case 'confirmed':
      return <CheckCircle2 {...common} />;
  }
}

export const OnchainBadge: React.FC<OnchainBadgeProps> = ({
  variant,
  currentConfirmations = 0,
  targetConfirmations = 0,
  size = 'md',
  className = '',
  subStatus,
  retryAttempt,
  maxRetries,
  txHash,
  onClick,
  progressBar = false,
}) => {
  const reducedMotion = useReducedMotion();
  const label = getAriaLabel(variant, currentConfirmations, targetConfirmations, subStatus, retryAttempt, maxRetries);
  const displayLabel = getLabel(variant, subStatus, retryAttempt, maxRetries);
  const iconSize = SIZE_ICON_MAP[size];
  const showCounter = (variant === 'confirming' || variant === 'confirmed') && !progressBar;
  const showProgress = (variant === 'confirming' || variant === 'confirmed') && progressBar;
  const isReverted = variant === 'confirmed' && subStatus === 'reverted';

  const variantClass = isReverted
    ? 'onchain-badge--reverted'
    : `onchain-badge--${variant}`;

  return (
    <span
      className={`onchain-badge ${variantClass} onchain-badge--${size}${txHash ? ' onchain-badge--clickable' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
      data-testid={`onchain-badge-${variant}`}
      title={txHash ? `Tx: ${txHash}` : undefined}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <span className="ob-icon">{getIcon(variant, iconSize, subStatus)}</span>
      <span className="ob-label">{displayLabel}</span>
      {showCounter && (
        <>
          <span className="ob-separator" aria-hidden="true">·</span>
          <Counter value={currentConfirmations} reduced={reducedMotion} />
          <span className="ob-target" aria-hidden="true">
            /{targetConfirmations}
          </span>
        </>
      )}
      {showProgress && (
        <ProgressBar current={currentConfirmations} target={targetConfirmations} reduced={reducedMotion} />
      )}
      {txHash && (
        <TxHashButton txHash={txHash} onClick={onClick} />
      )}
    </span>
  );
};

OnchainBadge.displayName = 'OnchainBadge';

export default OnchainBadge;
