import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { Button } from '../Button';
import './GovernanceDelegation.css';

/* ─── Types ──────────────────────────────────────────────────── */

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmText: string;
  confirmVariant: 'primary' | 'secondary';
  /** Whether the confirm action is processing */
  loading?: boolean;
  /** If true, shows a warning about active votes */
  hasActiveVotes?: boolean;
}

/* ─── Internal Dialog ────────────────────────────────────────── */

const Dialog: React.FC<BaseDialogProps & { children: React.ReactNode }> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmText,
  confirmVariant,
  loading = false,
  hasActiveVotes = false,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useRef(`gd-dialog-${Math.random().toString(36).slice(2, 9)}`);
  const descId = useRef(`gd-dialog-desc-${Math.random().toString(36).slice(2, 9)}`);
  const prevFocus = useRef<HTMLElement | null>(null);

  /* Open/close native dialog */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      prevFocus.current = document.activeElement as HTMLElement;
      dialog.showModal();
      const firstFocusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    } else {
      dialog.close();
      prevFocus.current?.focus();
    }
  }, [isOpen]);

  /* Escape key & focus trap */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      /* Focus trap */
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="gd-dialog"
      onClose={onClose}
      aria-labelledby={titleId.current}
      aria-describedby={descId.current}
      data-testid="delegation-dialog"
    >
      <div className="gd-dialog-content glass-card">
        {/* Header */}
        <div className="gd-dialog-header">
          <h3 id={titleId.current} className="gd-dialog-title">{title}</h3>
          <button
            type="button"
            className="gd-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="dialog-close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div id={descId.current} className="gd-dialog-body">
          {children}
        </div>

        {/* Active votes warning */}
        {hasActiveVotes && (
          <div className="gd-dialog-warning" role="alert" data-testid="active-votes-warning">
            <AlertTriangle size={16} aria-hidden="true" />
            <div>
              <strong>Active votes in progress</strong>
              <p>Revoking now will remove your delegate's ability to vote on your behalf in ongoing proposals.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="gd-dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading} data-testid="dialog-cancel">
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
            data-testid="dialog-confirm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </dialog>
  );
};

/* ─── DelegationConfirmDialog ────────────────────────────────── */

interface DelegationConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  delegateName: string;
  delegateAddress: string;
  /** The user's voting power being delegated */
  votingPower?: number;
  loading?: boolean;
}

export const DelegationConfirmDialog: React.FC<DelegationConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  delegateName,
  delegateAddress,
  votingPower = 0,
  loading = false,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirm Delegation"
      confirmText="Confirm Delegate"
      confirmVariant="primary"
      loading={loading}
    >
      <p className="gd-dialog-description">
        You are about to delegate <strong>{votingPower.toLocaleString()} VP</strong> of voting power to:
      </p>
      <div className="gd-dialog-delegate-info">
        <div className="gd-dialog-delegate-avatar" aria-hidden="true">
          {delegateName.charAt(0)}
        </div>
        <div>
          <div className="gd-dialog-delegate-name">{delegateName}</div>
          <div className="gd-dialog-delegate-addr text-muted">{delegateAddress}</div>
        </div>
      </div>
      <p className="gd-dialog-note text-muted">
        <Shield size={14} aria-hidden="true" />
        This delegate will be able to vote on your behalf in all governance proposals until you revoke.
      </p>
    </Dialog>
  );
};

/* ─── RevokeConfirmDialog ────────────────────────────────────── */

interface RevokeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  delegateName?: string;
  /** Whether there are active proposals the delegate is voting on */
  hasActiveVotes?: boolean;
  /** Number of active proposals */
  activeProposalCount?: number;
  loading?: boolean;
}

export const RevokeConfirmDialog: React.FC<RevokeConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  delegateName,
  hasActiveVotes = false,
  activeProposalCount = 0,
  loading = false,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Revoke Delegation"
      confirmText="Revoke"
      confirmVariant="secondary"
      hasActiveVotes={hasActiveVotes}
      loading={loading}
    >
      <p className="gd-dialog-description">
        {delegateName ? (
          <>
            Are you sure you want to revoke your delegation from <strong>{delegateName}</strong>?
          </>
        ) : (
          'Are you sure you want to revoke your delegation?'
        )}
        {' '}You will regain your voting power immediately.
      </p>
      {hasActiveVotes && activeProposalCount > 0 && (
        <p className="gd-dialog-note gd-dialog-note--warning">
          Your delegate is currently voting on <strong>{activeProposalCount} active proposal{activeProposalCount !== 1 ? 's' : ''}</strong>.
          Revoking will remove their ability to vote on your behalf in these proposals.
        </p>
      )}
      <p className="gd-dialog-note text-muted">
        You can delegate again to the same or a different delegate at any time.
      </p>
    </Dialog>
  );
};

DelegationConfirmDialog.displayName = 'DelegationConfirmDialog';
RevokeConfirmDialog.displayName = 'RevokeConfirmDialog';
export default { DelegationConfirmDialog, RevokeConfirmDialog };
