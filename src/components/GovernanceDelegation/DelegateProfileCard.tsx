import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '../Button';
import './GovernanceDelegation.css';

/* ─── Types ──────────────────────────────────────────────────── */

export interface VoteHistoryItem {
  proposalId: string;
  proposalTitle: string;
  voteChoice: 'for' | 'against' | 'abstain';
  /** Did this vote align with the majority outcome? */
  alignedWithOutcome: boolean;
  /** ISO timestamp of vote */
  votedAt: string;
}

export interface DelegateData {
  id: string;
  name: string;
  address: string;
  /** 0–100 */
  participationRate: number;
  /** 0–100 — % of votes aligned with delegator's stated preferences or majority */
  voteAlignment: number;
  totalDelegated: number;
  /** Wallet address of the current user — used to detect self-delegation */
  userAddress?: string;
  /** Areas of expertise, e.g. ["Treasury", "Security", "Ecosystem"] */
  expertiseTags?: string[];
  /** Short delegate bio */
  bio?: string;
  /** Past N votes for alignment review */
  voteHistory?: VoteHistoryItem[];
  /** Number of proposals voted on */
  totalProposalsVoted?: number;
  /** Average time between proposal creation and vote cast (hours) */
  avgResponseTimeHours?: number;
  /** Number of current delegators */
  delegatorCount?: number;
}

interface DelegateProfileCardProps {
  delegate: DelegateData;
  isDelegated: boolean;
  onDelegateClick: () => void;
  onRevokeClick: () => void;
  /** Whether the delegate is the current user */
  isSelf?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────── */

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/* ─── VoteChoiceBadge ────────────────────────────────────────── */

const VoteChoiceBadge: React.FC<{ choice: VoteHistoryItem['voteChoice'] }> = ({ choice }) => {
  const config = {
    for: { icon: <ThumbsUp size={10} aria-hidden="true" />, label: 'For', className: 'gd-choice--for' },
    against: { icon: <ThumbsDown size={10} aria-hidden="true" />, label: 'Against', className: 'gd-choice--against' },
    abstain: { icon: <Minus size={10} aria-hidden="true" />, label: 'Abstain', className: 'gd-choice--abstain' },
  };
  const c = config[choice];
  return (
    <span className={`gd-choice-badge ${c.className}`} aria-label={`Voted ${c.label}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

/* ─── AlignmentBar ───────────────────────────────────────────── */

const AlignmentBar: React.FC<{ value: number; threshold?: number }> = ({ value, threshold = 70 }) => {
  const pct = Math.min(value, 100);
  const isHigh = pct >= threshold;
  const isMid = pct >= 50 && pct < threshold;
  const barColor = isHigh ? 'var(--success)' : isMid ? '#f59e0b' : 'var(--error)';

  return (
    <div className="gd-alignment-bar-wrapper">
      <div className="gd-alignment-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Vote alignment: ${pct}%`}>
        <div className="gd-alignment-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        <div className="gd-alignment-threshold" style={{ left: `${threshold}%` }} aria-hidden="true" />
      </div>
      <div className="gd-alignment-labels">
        <span className={`gd-alignment-value ${isHigh ? 'text-success' : isMid ? 'gd-text-amber' : 'text-error'}`}>
          {pct}% alignment
        </span>
        <span className="gd-alignment-meta">{isHigh ? 'Highly aligned' : isMid ? 'Moderate' : 'Low alignment'}</span>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */

export const DelegateProfileCard: React.FC<DelegateProfileCardProps> = ({
  delegate,
  isDelegated,
  onDelegateClick,
  onRevokeClick,
  isSelf = false,
}) => {
  const {
    id,
    name,
    address,
    participationRate,
    voteAlignment,
    totalDelegated,
    expertiseTags = [],
    bio,
    voteHistory = [],
    totalProposalsVoted,
    avgResponseTimeHours,
    delegatorCount,
  } = delegate;

  return (
    <div className="gd-profile-card glass-card" data-testid={`delegate-card-${id}`}>
      {/* ── Header ── */}
      <div className="gd-profile-header">
        <div className="gd-profile-avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="gd-profile-identity">
          <div className="gd-profile-name-row">
            <h3 className="gd-profile-name">{name}</h3>
            {isSelf && (
              <span className="gd-self-badge" data-testid="self-delegate-badge">
                <Shield size={12} aria-hidden="true" />
                You
              </span>
            )}
            {isDelegated && (
              <span className="gd-delegated-badge" data-testid="active-delegation-badge">
                <UserCheck size={12} aria-hidden="true" />
                Active delegate
              </span>
            )}
          </div>
          <span className="gd-profile-address" title={address}>{truncateAddress(address)}</span>
        </div>
      </div>

      {/* ── Bio ── */}
      {bio && <p className="gd-profile-bio text-muted">{bio}</p>}

      {/* ── Expertise Tags ── */}
      {expertiseTags.length > 0 && (
        <div className="gd-expertise-tags" aria-label="Areas of expertise">
          <Zap size={14} aria-hidden="true" className="text-muted" />
          {expertiseTags.map((tag) => (
            <span key={tag} className="gd-expertise-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* ── Key Metrics ── */}
      <div className="gd-metrics-grid">
        <div className="gd-metric-card" data-testid="metric-participation">
          <span className="gd-metric-label">
            <TrendingUp size={14} aria-hidden="true" />
            Participation
          </span>
          <span className={`gd-metric-value ${participationRate >= 90 ? 'text-success' : participationRate >= 70 ? 'gd-text-amber' : 'text-error'}`}>
            {participationRate}%
          </span>
        </div>
        <div className="gd-metric-card" data-testid="metric-alignment">
          <span className="gd-metric-label">
            <Users size={14} aria-hidden="true" />
            Alignment
          </span>
          <span className={`gd-metric-value ${voteAlignment >= 80 ? 'text-success' : voteAlignment >= 60 ? 'gd-text-amber' : 'text-error'}`}>
            {voteAlignment}%
          </span>
        </div>
        <div className="gd-metric-card" data-testid="metric-delegated">
          <span className="gd-metric-label">
            <Award size={14} aria-hidden="true" />
            Delegated
          </span>
          <span className="gd-metric-value">{totalDelegated.toLocaleString()} VP</span>
        </div>
        {totalProposalsVoted !== undefined && (
          <div className="gd-metric-card" data-testid="metric-proposals">
            <span className="gd-metric-label">
              <CheckCircle2 size={14} aria-hidden="true" />
              Voted on
            </span>
            <span className="gd-metric-value">{totalProposalsVoted}</span>
          </div>
        )}
      </div>

      {/* ── Vote Alignment Visual ── */}
      <AlignmentBar value={voteAlignment} />

      {/* ── Additional Stats ── */}
      <div className="gd-extra-stats">
        {avgResponseTimeHours !== undefined && (
          <div className="gd-stat-item">
            <Clock size={14} aria-hidden="true" />
            <span>Avg response: <strong>{avgResponseTimeHours}h</strong></span>
          </div>
        )}
        {delegatorCount !== undefined && (
          <div className="gd-stat-item">
            <Users size={14} aria-hidden="true" />
            <span>{delegatorCount} delegator{delegatorCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Vote History Timeline ── */}
      {voteHistory.length > 0 && (
        <div className="gd-vote-history" data-testid="vote-history">
          <h4 className="gd-vote-history-title">Recent Votes</h4>
          <ul className="gd-vote-history-list">
            {voteHistory.map((vote) => (
              <li key={vote.proposalId} className="gd-vote-history-item">
                <div className="gd-vote-history-indicator" aria-hidden="true">
                  <div className={`gd-vote-dot ${vote.alignedWithOutcome ? 'gd-vote-dot--aligned' : 'gd-vote-dot--misaligned'}`} />
                  <div className="gd-vote-line" />
                </div>
                <div className="gd-vote-history-content">
                  <div className="gd-vote-history-top">
                    <span className="gd-vote-proposal-title" title={vote.proposalTitle}>
                      {vote.proposalTitle}
                    </span>
                    <VoteChoiceBadge choice={vote.voteChoice} />
                  </div>
                  <div className="gd-vote-history-meta">
                    <span className="gd-vote-date">{formatTimestamp(vote.votedAt)}</span>
                    <span className={`gd-vote-alignment ${vote.alignedWithOutcome ? 'text-success' : 'text-error'}`} aria-label={vote.alignedWithOutcome ? 'Aligned with outcome' : 'Opposed outcome'}>
                      {vote.alignedWithOutcome ? '✓ Aligned' : '✗ Opposed'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="gd-profile-actions">
        {isSelf ? (
          <div className="gd-self-message text-muted" data-testid="self-delegate-msg">
            <Shield size={16} aria-hidden="true" />
            You cannot delegate to yourself. Your voting power is always your own.
          </div>
        ) : isDelegated ? (
          <Button
            variant="secondary"
            onClick={onRevokeClick}
            aria-label={`Revoke delegation from ${name}`}
            className="gd-revoke-btn"
            data-testid="revoke-btn"
          >
            Revoke Delegation
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onDelegateClick}
            aria-label={`Delegate voting power to ${name}`}
            data-testid="delegate-btn"
          >
            Delegate Power
          </Button>
        )}
      </div>
    </div>
  );
};

DelegateProfileCard.displayName = 'DelegateProfileCard';
export default DelegateProfileCard;
