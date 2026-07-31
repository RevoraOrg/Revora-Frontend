import React from 'react';
import { Shield, UserCheck, Users, X } from 'lucide-react';
import { Button } from '../Button';
import './GovernanceDelegation.css';

/* ─── Types ──────────────────────────────────────────────────── */

export interface DelegatedPowerHeaderProps {
  /** Whether currently delegated */
  isDelegated: boolean;
  /** Delegate name if delegated */
  delegateName?: string;
  /** Delegate address if delegated */
  delegateAddress?: string;
  /** User's voting power amount */
  votingPower: number;
  /** Time since delegation (e.g., "2 days ago") */
  delegatedSince?: string;
  /** Called when user clicks revoke */
  onRevokeClick?: () => void;
  /** Whether self-delegated (user keeps own power) */
  isSelfDelegated?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────── */

function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/* ─── Component ──────────────────────────────────────────────── */

export const DelegatedPowerHeader: React.FC<DelegatedPowerHeaderProps> = ({
  isDelegated,
  delegateName,
  delegateAddress,
  votingPower,
  delegatedSince,
  onRevokeClick,
  isSelfDelegated = false,
}) => {
  return (
    <div
      className="gd-power-header glass-card"
      data-testid="delegated-power-header"
      aria-label="Delegation status"
    >
      <div className="gd-power-header-content">
        {/* Icon */}
        <div className="gd-power-header-icon" aria-hidden="true">
          {isDelegated && !isSelfDelegated ? (
            <UserCheck size={20} />
          ) : isSelfDelegated ? (
            <Shield size={20} />
          ) : (
            <Users size={20} />
          )}
        </div>

        {/* Info */}
        <div className="gd-power-header-info">
          {isDelegated && !isSelfDelegated ? (
            <>
              <span className="gd-power-header-label">Voting power delegated to</span>
              <span className="gd-power-header-delegate">
                {delegateName}
                {delegateAddress && (
                  <span className="gd-power-header-address" title={delegateAddress}>
                    {truncateAddress(delegateAddress)}
                  </span>
                )}
              </span>
              {delegatedSince && (
                <span className="gd-power-header-since text-muted">
                  Since {delegatedSince}
                </span>
              )}
            </>
          ) : isSelfDelegated ? (
            <>
              <span className="gd-power-header-label">Self-delegated</span>
              <span className="gd-power-header-value">
                {votingPower.toLocaleString()} VP
              </span>
              <span className="gd-power-header-since text-muted">
                You vote with your own power
              </span>
            </>
          ) : (
            <>
              <span className="gd-power-header-label">Voting power available</span>
              <span className="gd-power-header-value">
                {votingPower.toLocaleString()} VP
              </span>
              <span className="gd-power-header-since text-muted">
                Not currently delegated
              </span>
            </>
          )}
        </div>

        {/* Action */}
        {isDelegated && !isSelfDelegated && onRevokeClick && (
          <Button
            variant="secondary"
            onClick={onRevokeClick}
            aria-label={`Revoke delegation from ${delegateName || 'delegate'}`}
            className="gd-power-header-revoke"
            data-testid="power-header-revoke"
          >
            <X size={14} aria-hidden="true" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
};

DelegatedPowerHeader.displayName = 'DelegatedPowerHeader';
export default DelegatedPowerHeader;
