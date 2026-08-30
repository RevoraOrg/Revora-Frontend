import React, { useState, useEffect, useRef, useId } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  WifiOff,
  ServerOff,
  Wallet,
  RefreshCw,
  LifeBuoy,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import './FormError.css';
import { useReducedMotion } from '../hooks/useReducedMotion';

export type ErrorScope = 'inline' | 'modal' | 'page';
export type ErrorCategory = 'network' | 'rpc' | 'wallet' | 'server' | 'validation' | 'generic' | 'custom';

export interface FormErrorProps {
  /** The primary error message text */
  message?: string | null;
  /** Optional title heading for the error */
  title?: string;
  /** Optional extended description or recovery advice */
  description?: string | null;
  /** Unique ID for accessibility linkages (aria-describedby) */
  id?: string;
  /** Additional CSS class names */
  className?: string;
  /** Presentation scope: 'inline' (default form banner), 'modal' (dialog overlay), or 'page' (full-view) */
  scope?: ErrorScope;
  /** Error category for tailored icon, title, and guidance */
  errorType?: ErrorCategory;
  /** Optional machine-readable error code (e.g. 4001, TX_REJECTED, ERR_NETWORK) */
  errorCode?: string | number;
  /** Optional on-chain transaction hash */
  txHash?: string;
  /** Optional timestamp of failure */
  timestamp?: string | number | Date;
  /** Raw error object, stack trace, or payload for technical diagnostics */
  details?: string | Record<string, unknown> | Error | null;
  /** Callback triggered when user clicks Retry */
  onRetry?: () => void | Promise<void>;
  /** Custom label for retry button (default: "Retry") */
  retryLabel?: string;
  /** Loading/retrying state to show spinner and disable button */
  isRetrying?: boolean;
  /** Current retry attempt count */
  retryCount?: number;
  /** Maximum retry attempts allowed before disabling */
  maxRetries?: number;
  /** Cooldown timer countdown in seconds */
  retryCountdown?: number;
  /** Force disable retry button */
  disableRetry?: boolean;
  /** Callback triggered when user dismisses or cancels the error */
  onDismiss?: () => void;
  /** Alias for onDismiss */
  onCancel?: () => void;
  /** Custom label for dismiss/cancel button */
  dismissLabel?: string;
  /** Whether to render the dismiss/close button */
  showDismiss?: boolean;
  /** Callback triggered when user clicks Contact Support */
  onContactSupport?: () => void;
  /** Support email address (generates mailto link if provided) */
  supportEmail?: string;
  /** Support center or help URL */
  supportUrl?: string;
  /** Custom label for contact support button (default: "Contact Support") */
  supportLabel?: string;
  /** Explicitly toggle display of support action */
  showSupport?: boolean;
  /** Initial expanded state for technical details accordion */
  defaultShowDetails?: boolean;
  /** Custom children to render inside the error container */
  children?: React.ReactNode;
}

/**
 * Returns default icon and metadata based on errorCategory.
 */
function getErrorDefaults(category?: ErrorCategory) {
  switch (category) {
    case 'network':
      return {
        Icon: WifiOff,
        defaultTitle: 'Network Connection Error',
        defaultDescription: 'Unable to connect to the network. Please check your internet connection.',
      };
    case 'rpc':
      return {
        Icon: ServerOff,
        defaultTitle: 'Blockchain RPC Error',
        defaultDescription: 'Unable to reach the blockchain node. The network may be congested or undergoing maintenance.',
      };
    case 'wallet':
      return {
        Icon: Wallet,
        defaultTitle: 'Transaction Rejected',
        defaultDescription: 'The transaction was rejected or cancelled in your wallet. You can review the details and try again.',
      };
    case 'server':
      return {
        Icon: AlertTriangle,
        defaultTitle: 'Server Error (5xx)',
        defaultDescription: 'An unexpected server error occurred. Our team has been notified.',
      };
    case 'validation':
      return {
        Icon: AlertCircle,
        defaultTitle: 'Validation Error',
        defaultDescription: null,
      };
    default:
      return {
        Icon: AlertCircle,
        defaultTitle: undefined,
        defaultDescription: null,
      };
  }
}

/**
 * FormError component for displaying accessible, unified error-recovery patterns across
 * inline forms, modal dialogs, and full-page error states.
 *
 * Conforms to WCAG 2.1 AA guidelines, supports screen readers (role="alert" / "alertdialog"),
 * reduced motion preferences, mobile reachability, and diagnostic tracing.
 */
export const FormError: React.FC<FormErrorProps> = ({
  message,
  title,
  description,
  id = 'form-error',
  className = '',
  scope = 'inline',
  errorType = 'generic',
  errorCode,
  txHash,
  timestamp,
  details,
  onRetry,
  retryLabel = 'Retry',
  isRetrying = false,
  retryCount,
  maxRetries,
  retryCountdown = 0,
  disableRetry = false,
  onDismiss,
  onCancel,
  dismissLabel,
  showDismiss,
  onContactSupport,
  supportEmail,
  supportUrl,
  supportLabel = 'Contact Support',
  showSupport,
  defaultShowDetails = false,
  children,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(defaultShowDetails);
  const [copied, setCopied] = useState<boolean>(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const detailsId = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const prefersReduced = useReducedMotion();

  const handleDismiss = onDismiss || onCancel;
  const isDismissable = showDismiss ?? Boolean(handleDismiss);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Modal Focus Trap & Keyboard (Escape) Listener
  useEffect(() => {
    if (scope !== 'modal' || !handleDismiss) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scope, handleDismiss]);

  // If no message, title, details, or children, return null (preserves original behavior)
  if (!message && !title && !details && !children) {
    return null;
  }

  const { Icon, defaultTitle, defaultDescription } = getErrorDefaults(errorType);
  const displayTitle = title || (scope !== 'inline' ? defaultTitle : undefined);
  const displayDescription = description !== undefined ? description : (scope !== 'inline' ? defaultDescription : null);

  const formattedTimestamp = timestamp
    ? timestamp instanceof Date
      ? timestamp.toISOString()
      : String(timestamp)
    : undefined;

  const hasDiagnostics = Boolean(errorCode || txHash || formattedTimestamp || details);

  // Format details payload for copying
  const getDiagnosticPayload = (): string => {
    const lines: string[] = [];
    if (displayTitle) lines.push(`Title: ${displayTitle}`);
    if (message) lines.push(`Message: ${message}`);
    if (errorCode) lines.push(`Error Code: ${errorCode}`);
    if (txHash) lines.push(`Transaction Hash: ${txHash}`);
    if (formattedTimestamp) lines.push(`Timestamp: ${formattedTimestamp}`);
    if (details) {
      lines.push(
        `Details: ${
          typeof details === 'object'
            ? JSON.stringify(details, null, 2)
            : String(details)
        }`
      );
    }
    return lines.join('\n');
  };

  const handleCopyDetails = async () => {
    const payload = getDiagnosticPayload();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback if clipboard API fails
      }
    }
  };

  const isRetryDisabled =
    disableRetry ||
    isRetrying ||
    retryCountdown > 0 ||
    (maxRetries !== undefined && retryCount !== undefined && retryCount >= maxRetries);

  const retryButtonText = isRetrying
    ? 'Retrying...'
    : retryCountdown > 0
    ? `${retryLabel} (${retryCountdown}s)`
    : retryCount !== undefined && maxRetries !== undefined
    ? `${retryLabel} (${retryCount}/${maxRetries})`
    : retryLabel;

  // Determine whether to display Contact Support
  const shouldShowSupport =
    showSupport ?? Boolean(onContactSupport || supportEmail || supportUrl || scope === 'page');

  // Support CTA component
  const renderSupportButton = () => {
    if (!shouldShowSupport) return null;

    if (supportUrl) {
      return (
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="form-error__btn form-error__btn--support"
          aria-label={`${supportLabel} (opens in new tab)`}
        >
          <LifeBuoy size={15} aria-hidden="true" />
          <span>{supportLabel}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      );
    }

    if (supportEmail) {
      const mailtoSubject = encodeURIComponent(`Error Report: ${errorCode || message || 'Issue'}`);
      const mailtoBody = encodeURIComponent(`Diagnostic Details:\n\n${getDiagnosticPayload()}`);
      return (
        <a
          href={`mailto:${supportEmail}?subject=${mailtoSubject}&body=${mailtoBody}`}
          className="form-error__btn form-error__btn--support"
        >
          <LifeBuoy size={15} aria-hidden="true" />
          <span>{supportLabel}</span>
        </a>
      );
    }

    if (onContactSupport) {
      return (
        <button
          type="button"
          onClick={onContactSupport}
          className="form-error__btn form-error__btn--support"
        >
          <LifeBuoy size={15} aria-hidden="true" />
          <span>{supportLabel}</span>
        </button>
      );
    }

    return null;
  };

  // Actions Container
  const renderActions = () => {
    const hasActions = Boolean(onRetry || handleDismiss || shouldShowSupport);
    if (!hasActions) return null;

    return (
      <div className="form-error__actions" role="group" aria-label="Error recovery actions">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetryDisabled}
            className="form-error__btn form-error__btn--retry"
            aria-busy={isRetrying}
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              className={isRetrying && !prefersReduced ? 'form-error__spinner' : ''}
            />
            <span>{retryButtonText}</span>
          </button>
        )}

        {handleDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            className="form-error__btn form-error__btn--dismiss"
          >
            <span>{dismissLabel || (scope === 'modal' ? 'Cancel' : 'Dismiss')}</span>
          </button>
        )}

        {renderSupportButton()}
      </div>
    );
  };

  // Technical Diagnostics Section
  const renderDiagnostics = () => {
    if (!hasDiagnostics) return null;

    return (
      <div className="form-error__details-section">
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="form-error__details-toggle"
          aria-expanded={showDetails}
          aria-controls={detailsId}
        >
          {showDetails ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          <span>{showDetails ? 'Hide technical details' : 'Show technical details'}</span>
        </button>

        {showDetails && (
          <div id={detailsId} className="form-error__details-content" role="region" aria-label="Error diagnostics">
            <div className="form-error__meta-grid">
              {errorCode && (
                <>
                  <span className="form-error__meta-label">Code:</span>
                  <span className="form-error__meta-value">{errorCode}</span>
                </>
              )}
              {txHash && (
                <>
                  <span className="form-error__meta-label">Tx Hash:</span>
                  <span className="form-error__meta-value">{txHash}</span>
                </>
              )}
              {formattedTimestamp && (
                <>
                  <span className="form-error__meta-label">Time:</span>
                  <span className="form-error__meta-value">{formattedTimestamp}</span>
                </>
              )}
            </div>

            {details && (
              <div className="form-error__trace-box" tabIndex={0} role="region" aria-label="Error stack trace">
                {typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyDetails}
              className="form-error__copy-btn"
              aria-label={copied ? 'Copied error details' : 'Copy technical error details to clipboard'}
            >
              {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Details'}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // SCOPE: MODAL
  // =========================================================================
  if (scope === 'modal') {
    return (
      <div className="form-error-modal__backdrop" onClick={handleDismiss}>
        <div
          ref={modalRef}
          className={`form-error form-error--modal ${className}`}
          role="alertdialog"
          aria-modal="true"
          id={id}
          aria-labelledby={displayTitle ? titleId : undefined}
          aria-describedby={message ? descId : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="form-error__modal-header">
            <div className="form-error__icon-wrapper" aria-hidden="true">
              <Icon size={24} />
            </div>

            <div className="form-error__content">
              {displayTitle && (
                <h3 id={titleId} className="form-error__title">
                  {displayTitle}
                </h3>
              )}
              {message && (
                <p id={descId} className="form-error__message">
                  {message}
                </p>
              )}
              {displayDescription && (
                <p className="form-error__description">{displayDescription}</p>
              )}
            </div>

            {isDismissable && handleDismiss && (
              <button
                type="button"
                onClick={handleDismiss}
                className="form-error__close-btn"
                aria-label="Close error dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>

          {children}
          {renderDiagnostics()}
          {renderActions()}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCOPE: PAGE
  // =========================================================================
  if (scope === 'page') {
    return (
      <div
        className={`form-error form-error--page ${className}`}
        role="alert"
        id={id}
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="form-error__icon-wrapper" aria-hidden="true">
          <Icon size={36} />
        </div>

        {displayTitle && <h2 id={titleId} className="form-error__title">{displayTitle}</h2>}
        {message && <p id={descId} className="form-error__message">{message}</p>}
        {displayDescription && <p className="form-error__description">{displayDescription}</p>}

        {children}
        {renderDiagnostics()}
        {renderActions()}
      </div>
    );
  }

  // =========================================================================
  // SCOPE: INLINE (Default)
  // =========================================================================
  return (
    <div
      className={`form-error form-error--inline ${className}`}
      role="alert"
      id={id}
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="form-error__icon-wrapper" aria-hidden="true">
        <Icon size={16} />
      </div>

      <div className="form-error__content">
        {displayTitle && (
          <div className="form-error__header">
            <h4 id={titleId} className="form-error__title">{displayTitle}</h4>
            {isDismissable && handleDismiss && (
              <button
                type="button"
                onClick={handleDismiss}
                className="form-error__close-btn"
                aria-label="Dismiss error"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {message && <p className="form-error__message">{message}</p>}
        {displayDescription && <p className="form-error__description">{displayDescription}</p>}

        {children}
        {renderDiagnostics()}
        {renderActions()}
      </div>

      {/* Dismiss button when no title header is rendered */}
      {!displayTitle && isDismissable && handleDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className="form-error__close-btn"
          aria-label="Dismiss error"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
