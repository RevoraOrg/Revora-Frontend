/**
 * GovernanceVoting — Token-holder governance proposal detail and voting flow (Issue #629).
 *
 * Requirements:
 * - Accessible (WCAG 2.1 AA) with keyboard navigation, focus trapping, and ARIA announcements.
 * - Proposal header with status pill, quorum progress, and end/start time.
 * - Color-blind accessible vote tally bars paired with numeric percentages and text fallback.
 * - Voting power summary card with voter eligibility state.
 * - Vote selection (For/Against/Abstain) with clear confirmation modal flow.
 * - Concurrency protection, failure recovery with retry, and boundary handling.
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MinusCircle,
  RotateCcw,
  ShieldCheck,
  User,
  Vote,
  X,
  XCircle,
} from 'lucide-react';
import type {
  GovernanceProposal,
  GovernanceVotingProps,
  ProposalStatus,
  VoteChoice,
  VoteSubmissionResult,
} from './types';
import { mockGovernanceProposals } from './mockProposals';
import './GovernanceVoting.css';

/* ─── Helpers ──────────────────────────────────────────────────────── */

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

function formatTokens(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M REV`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K REV`;
  }
  return `${formatNumber(num)} REV`;
}

function formatTimeRemaining(status: ProposalStatus, startTime: number, endTime: number): string {
  const now = Date.now();

  if (status === 'pre_voting') {
    const diff = startTime - now;
    if (diff <= 0) return 'Starts shortly';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `Starts in ${days}d ${hours}h`;
    return `Starts in ${hours}h`;
  }

  if (status !== 'active') {
    return 'Voting concluded';
  }

  const diff = endTime - now;
  if (diff <= 0) return 'Voting ended';

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

/* ─── Proposal Status Pill ─────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  active: {
    label: 'Active',
    className: 'gv-pill--active',
    icon: <Clock size={12} aria-hidden="true" />,
  },
  pre_voting: {
    label: 'Pre-voting',
    className: 'gv-pill--pre_voting',
    icon: <Calendar size={12} aria-hidden="true" />,
  },
  passed: {
    label: 'Passed',
    className: 'gv-pill--passed',
    icon: <CheckCircle2 size={12} aria-hidden="true" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'gv-pill--rejected',
    icon: <XCircle size={12} aria-hidden="true" />,
  },
  quorum_failed: {
    label: 'Quorum Failed',
    className: 'gv-pill--quorum_failed',
    icon: <MinusCircle size={12} aria-hidden="true" />,
  },
};

export const GovernanceVoting: React.FC<GovernanceVotingProps> = ({
  proposal: initialProposal,
  proposals = mockGovernanceProposals,
  onVoteSubmit,
  compact = false,
  className = '',
}) => {
  const proposalList = proposals.length > 0 ? proposals : mockGovernanceProposals;
  const [selectedProposalId, setSelectedProposalId] = useState<string>(
    initialProposal?.id || proposalList[0]?.id || 'prop-101'
  );

  // Sync if initialProposal changes from outside
  useEffect(() => {
    if (initialProposal?.id) {
      setSelectedProposalId(initialProposal.id);
    }
  }, [initialProposal?.id]);

  const activeProposal =
    initialProposal && initialProposal.id === selectedProposalId
      ? initialProposal
      : proposalList.find((p) => p.id === selectedProposalId) || proposalList[0];

  // Local state for proposal data so voting immediately updates the view
  const [currentProposal, setCurrentProposal] = useState<GovernanceProposal>(activeProposal);

  useEffect(() => {
    setCurrentProposal(activeProposal);
  }, [activeProposal]);

  const [selectedChoice, setSelectedChoice] = useState<VoteChoice>('for');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<VoteSubmissionResult | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const modalTitleId = useId();
  const modalDescId = useId();

  const {
    id,
    title,
    description,
    proposer,
    category,
    status,
    startTime,
    endTime,
    quorumRequired,
    quorumReached,
    totalVotingWeight,
    tally,
    userVote,
    userVotingPower,
    discussionUrl,
  } = currentProposal;

  // Calculation of tallies and percentages
  const totalVotesCast = tally.forVotes + tally.againstVotes + tally.abstainVotes;
  const forPct = totalVotesCast > 0 ? (tally.forVotes / totalVotesCast) * 100 : 0;
  const againstPct = totalVotesCast > 0 ? (tally.againstVotes / totalVotesCast) * 100 : 0;
  const abstainPct = totalVotesCast > 0 ? (tally.abstainVotes / totalVotesCast) * 100 : 0;

  // Quorum calculations
  const quorumPct = quorumRequired > 0 ? Math.min((quorumReached / quorumRequired) * 100, 100) : 0;
  const isQuorumMet = quorumReached >= quorumRequired;

  // Voting power percentage
  const votingPowerPct =
    totalVotingWeight > 0 ? ((userVotingPower / totalVotingWeight) * 100).toFixed(2) : '0.00';

  // Eligibility rules
  const canVote =
    status === 'active' &&
    userVotingPower > 0 &&
    userVote === null;

  // Time label
  const timeLabel = formatTimeRemaining(status, startTime, endTime);

  // Focus trap inside modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isSubmitting) {
          closeModal();
        }
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isSubmitting]);

  // Focus management when opening / closing modal
  const openModal = () => {
    setSubmissionError(null);
    setSubmissionSuccess(null);
    setIsModalOpen(true);
    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSubmissionError(null);
    setSubmissionSuccess(null);
    setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 50);
  }, []);

  // Handle vote submission
  const handleConfirmVote = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      let result: VoteSubmissionResult;

      if (onVoteSubmit) {
        result = await onVoteSubmit(id, selectedChoice, userVotingPower);
      } else {
        // Default safe simulated transaction submission
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = {
          success: true,
          txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
          timestamp: Date.now(),
        };
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to broadcast vote to the Stellar ledger.');
      }

      // Update local proposal state
      const updatedTally = { ...tally };
      if (selectedChoice === 'for') {
        updatedTally.forVotes += userVotingPower;
      } else if (selectedChoice === 'against') {
        updatedTally.againstVotes += userVotingPower;
      } else {
        updatedTally.abstainVotes += userVotingPower;
      }

      const updatedQuorumReached = quorumReached + userVotingPower;

      setCurrentProposal((prev) => ({
        ...prev,
        quorumReached: updatedQuorumReached,
        tally: updatedTally,
        userVote: selectedChoice,
      }));

      setSubmissionSuccess(result);

      // Announce for screen readers
      const newTotal = totalVotesCast + userVotingPower;
      const newPct = ((updatedTally[selectedChoice === 'for' ? 'forVotes' : selectedChoice === 'against' ? 'againstVotes' : 'abstainVotes'] / newTotal) * 100).toFixed(1);
      setLiveAnnouncement(
        `Vote cast successfully for ${selectedChoice}. ${selectedChoice} tally is now ${newPct}%.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation for vote choice radiogroup
  const handleRadioKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    choice: VoteChoice
  ) => {
    const choices: VoteChoice[] = ['for', 'against', 'abstain'];
    const currentIndex = choices.indexOf(choice);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % choices.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + choices.length) % choices.length;
      e.preventDefault();
    }

    if (nextIndex !== currentIndex) {
      setSelectedChoice(choices[nextIndex]);
      const nextBtn = document.getElementById(`vote-choice-${choices[nextIndex]}`);
      nextBtn?.focus();
    }
  };

  return (
    <div
      className={`gv-container ${compact ? 'gv-container--compact' : ''} ${className}`}
      data-testid="governance-voting"
    >
      {/* Screen Reader Live Region for Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-announcement">
        {liveAnnouncement}
      </div>

      {/* Top Bar: Proposal Selector */}
      {proposalList.length > 1 && (
        <div className="gv-top-bar" data-testid="proposal-switcher">
          <div className="gv-switcher">
            <label htmlFor="proposal-select" className="gv-switcher-label">
              Proposal:
            </label>
            <select
              id="proposal-select"
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="gv-select"
              aria-label="Select proposal to review"
            >
              {proposalList.map((p) => (
                <option key={p.id} value={p.id}>
                  [{STATUS_CONFIG[p.status].label}] {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Proposal Hero Header */}
      <section className="gv-hero-card" aria-labelledby="proposal-heading">
        <div className="gv-hero-meta">
          <div className="gv-pills">
            <span
              className={`gv-pill ${STATUS_CONFIG[status].className}`}
              data-testid={`status-pill-${status}`}
            >
              {STATUS_CONFIG[status].icon}
              {STATUS_CONFIG[status].label}
            </span>
            {category && (
              <span className="gv-pill gv-pill--category">
                {category}
              </span>
            )}
          </div>

          <div className="gv-timing-badge" data-testid="timing-badge">
            <Clock size={14} aria-hidden="true" />
            <span>{timeLabel}</span>
          </div>
        </div>

        <h2 id="proposal-heading" className="gv-title" data-testid="proposal-title">
          {title}
        </h2>
        <p className="gv-description" data-testid="proposal-description">
          {description}
        </p>

        <div className="gv-proposer-row">
          <div className="gv-proposer-info">
            <User size={14} aria-hidden="true" />
            <span>
              Proposed by <strong>{proposer}</strong>
            </span>
          </div>

          {discussionUrl && (
            <a
              href={discussionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              aria-label="View community discussion thread for this proposal"
            >
              Discussion thread
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      {/* Quorum Progress Bar */}
      <section className="gv-quorum-card" aria-labelledby="quorum-heading">
        <div className="gv-quorum-header">
          <div className="gv-quorum-title" id="quorum-heading">
            <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
            <span>Quorum Requirement</span>
          </div>
          <div className="gv-quorum-values" data-testid="quorum-numbers">
            <span className="gv-quorum-current">{formatTokens(quorumReached)}</span>
            <span> / {formatTokens(quorumRequired)}</span>
          </div>
        </div>

        <div
          className="gv-quorum-track"
          role="progressbar"
          aria-valuenow={Math.round(quorumReached)}
          aria-valuemin={0}
          aria-valuemax={Math.round(quorumRequired)}
          aria-label={`Quorum Progress: ${formatTokens(quorumReached)} of ${formatTokens(quorumRequired)} (${quorumPct.toFixed(1)}%)`}
          data-testid="quorum-progressbar"
        >
          <div
            className={`gv-quorum-fill ${isQuorumMet ? 'gv-quorum-fill--met' : ''}`}
            style={{ width: `${quorumPct}%` }}
          />
        </div>

        <div className="gv-quorum-footer">
          <span>
            {quorumPct.toFixed(1)}% reached
          </span>
          <span
            className={`gv-quorum-status-text ${isQuorumMet ? 'gv-quorum-status-text--met' : 'gv-quorum-status-text--pending'}`}
            data-testid="quorum-status-text"
          >
            {isQuorumMet ? '✓ Quorum achieved' : 'Quorum not yet reached'}
          </span>
        </div>
      </section>

      {/* Two Column Grid: Tally Visualization & Voting Power */}
      <div className="gv-grid-layout">
        {/* Vote Tally Visualization */}
        <section className="gv-tally-card" aria-labelledby="tally-heading">
          <div className="gv-tally-header">
            <h3 id="tally-heading" className="gv-tally-title">
              Vote Tally
            </h3>
            <span className="gv-tally-total" data-testid="tally-total-votes">
              Total: {formatTokens(totalVotesCast)}
            </span>
          </div>

          {/* Screen Reader Table Fallback */}
          <div className="sr-only">
            <table>
              <caption>Current voting results breakdown</caption>
              <thead>
                <tr>
                  <th scope="col">Choice</th>
                  <th scope="col">Votes</th>
                  <th scope="col">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>For</td>
                  <td>{formatTokens(tally.forVotes)}</td>
                  <td>{forPct.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Against</td>
                  <td>{formatTokens(tally.againstVotes)}</td>
                  <td>{againstPct.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Abstain</td>
                  <td>{formatTokens(tally.abstainVotes)}</td>
                  <td>{abstainPct.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Color-blind Accessible Segmented Stacked Bar */}
          <div className="gv-stacked-bar-container" data-testid="vote-tally-bar">
            <div className="gv-stacked-bar" aria-hidden="true">
              {totalVotesCast > 0 ? (
                <>
                  <div
                    className="gv-stacked-segment gv-bar--for"
                    style={{ width: `${forPct}%` }}
                    title={`For: ${forPct.toFixed(1)}%`}
                    data-testid="bar-segment-for"
                  />
                  <div
                    className="gv-stacked-segment gv-bar--against"
                    style={{ width: `${againstPct}%` }}
                    title={`Against: ${againstPct.toFixed(1)}%`}
                    data-testid="bar-segment-against"
                  />
                  <div
                    className="gv-stacked-segment gv-bar--abstain"
                    style={{ width: `${abstainPct}%` }}
                    title={`Abstain: ${abstainPct.toFixed(1)}%`}
                    data-testid="bar-segment-abstain"
                  />
                </>
              ) : (
                <div className="gv-stacked-empty">No votes cast yet</div>
              )}
            </div>
          </div>

          {/* Tally Legend with Patterns & Percentages */}
          <div className="gv-tally-legend" data-testid="tally-legend">
            <div className="gv-legend-card">
              <div className="gv-legend-top text-emerald-400">
                <span className="gv-swatch gv-swatch--for" aria-hidden="true" />
                <span>For</span>
              </div>
              <span className="gv-legend-pct" data-testid="legend-pct-for">
                {forPct.toFixed(1)}%
              </span>
              <span className="gv-legend-count">{formatTokens(tally.forVotes)}</span>
            </div>

            <div className="gv-legend-card">
              <div className="gv-legend-top text-red-400">
                <span className="gv-swatch gv-swatch--against" aria-hidden="true" />
                <span>Against</span>
              </div>
              <span className="gv-legend-pct" data-testid="legend-pct-against">
                {againstPct.toFixed(1)}%
              </span>
              <span className="gv-legend-count">{formatTokens(tally.againstVotes)}</span>
            </div>

            <div className="gv-legend-card">
              <div className="gv-legend-top text-slate-400">
                <span className="gv-swatch gv-swatch--abstain" aria-hidden="true" />
                <span>Abstain</span>
              </div>
              <span className="gv-legend-pct" data-testid="legend-pct-abstain">
                {abstainPct.toFixed(1)}%
              </span>
              <span className="gv-legend-count">{formatTokens(tally.abstainVotes)}</span>
            </div>
          </div>
        </section>

        {/* Voting Power Summary */}
        <section className="gv-power-card" aria-labelledby="power-heading">
          <div className="gv-power-header">
            <Vote size={18} className="text-primary" aria-hidden="true" />
            <h3 id="power-heading">Voting Power Summary</h3>
          </div>

          <div className="gv-power-metric-box">
            <p className="gv-power-label">Your Available Power</p>
            <p className="gv-power-value" data-testid="user-voting-power">
              {formatTokens(userVotingPower)}
            </p>
            <p className="gv-power-subtext">
              {votingPowerPct}% of total voting pool ({formatTokens(totalVotingWeight)})
            </p>
          </div>

          <div className="mt-auto">
            {userVote ? (
              <div
                className="gv-eligibility-badge gv-eligibility--voted"
                data-testid="voted-indicator"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>
                  You voted <strong>{userVote.toUpperCase()}</strong>
                </span>
              </div>
            ) : status === 'pre_voting' ? (
              <div className="gv-eligibility-badge gv-eligibility--eligible">
                <Calendar size={16} aria-hidden="true" />
                <span>Voting opens soon</span>
              </div>
            ) : status !== 'active' ? (
              <div className="gv-eligibility-badge gv-eligibility--ineligible">
                <MinusCircle size={16} aria-hidden="true" />
                <span>Voting concluded</span>
              </div>
            ) : userVotingPower > 0 ? (
              <div className="gv-eligibility-badge gv-eligibility--eligible">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Eligible to cast vote</span>
              </div>
            ) : (
              <div className="gv-eligibility-badge gv-eligibility--ineligible">
                <AlertCircle size={16} aria-hidden="true" />
                <span>0 REV tokens — Ineligible to vote</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Vote Selection Section */}
      <section className="gv-selection-section" aria-labelledby="selection-heading">
        <h3 id="selection-heading" className="gv-selection-title">
          Cast Your Vote
        </h3>

        <div
          role="radiogroup"
          aria-labelledby="selection-heading"
          className="gv-selection-options"
          data-testid="vote-radiogroup"
        >
          {/* Option: For */}
          <button
            type="button"
            role="radio"
            id="vote-choice-for"
            aria-checked={selectedChoice === 'for'}
            tabIndex={selectedChoice === 'for' ? 0 : -1}
            disabled={!canVote}
            onClick={() => setSelectedChoice('for')}
            onKeyDown={(e) => handleRadioKeyDown(e, 'for')}
            className={`gv-choice-card ${selectedChoice === 'for' ? 'gv-choice-card--selected-for' : ''}`}
            data-testid="vote-option-for"
          >
            <div className="gv-choice-header">
              <span className="gv-choice-label text-emerald-400">
                <CheckCircle2 size={18} aria-hidden="true" />
                For
              </span>
              <span className="gv-swatch gv-swatch--for" aria-hidden="true" />
            </div>
            <p className="gv-choice-desc">Approve and support proposal execution</p>
          </button>

          {/* Option: Against */}
          <button
            type="button"
            role="radio"
            id="vote-choice-against"
            aria-checked={selectedChoice === 'against'}
            tabIndex={selectedChoice === 'against' ? 0 : -1}
            disabled={!canVote}
            onClick={() => setSelectedChoice('against')}
            onKeyDown={(e) => handleRadioKeyDown(e, 'against')}
            className={`gv-choice-card ${selectedChoice === 'against' ? 'gv-choice-card--selected-against' : ''}`}
            data-testid="vote-option-against"
          >
            <div className="gv-choice-header">
              <span className="gv-choice-label text-red-400">
                <XCircle size={18} aria-hidden="true" />
                Against
              </span>
              <span className="gv-swatch gv-swatch--against" aria-hidden="true" />
            </div>
            <p className="gv-choice-desc">Oppose and reject proposal execution</p>
          </button>

          {/* Option: Abstain */}
          <button
            type="button"
            role="radio"
            id="vote-choice-abstain"
            aria-checked={selectedChoice === 'abstain'}
            tabIndex={selectedChoice === 'abstain' ? 0 : -1}
            disabled={!canVote}
            onClick={() => setSelectedChoice('abstain')}
            onKeyDown={(e) => handleRadioKeyDown(e, 'abstain')}
            className={`gv-choice-card ${selectedChoice === 'abstain' ? 'gv-choice-card--selected-abstain' : ''}`}
            data-testid="vote-option-abstain"
          >
            <div className="gv-choice-header">
              <span className="gv-choice-label text-slate-300">
                <MinusCircle size={18} aria-hidden="true" />
                Abstain
              </span>
              <span className="gv-swatch gv-swatch--abstain" aria-hidden="true" />
            </div>
            <p className="gv-choice-desc">Contribute to quorum without voting a side</p>
          </button>
        </div>

        <div className="gv-vote-action-bar">
          <div className="gv-vote-status-note">
            {userVote ? (
              <span>Your vote of <strong>{userVote.toUpperCase()}</strong> has been recorded on-chain.</span>
            ) : status === 'pre_voting' ? (
              <span>Voting starts when the pre-voting period concludes.</span>
            ) : status !== 'active' ? (
              <span>Voting has concluded for this proposal.</span>
            ) : userVotingPower === 0 ? (
              <span>You must hold REV tokens at snapshot to cast a vote.</span>
            ) : (
              <span>Your choice will commit <strong>{formatTokens(userVotingPower)}</strong> to the tally.</span>
            )}
          </div>

          <button
            ref={triggerButtonRef}
            type="button"
            disabled={!canVote}
            onClick={openModal}
            className="gv-btn-submit"
            data-testid="review-vote-button"
            aria-haspopup="dialog"
          >
            <Vote size={18} aria-hidden="true" />
            Review & Cast Vote
          </button>
        </div>
      </section>

      {/* Confirmation Modal Flow */}
      {isModalOpen && (
        <div
          className="gv-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              closeModal();
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescId}
            className="gv-modal-card"
            data-testid="vote-confirm-modal"
          >
            {submissionSuccess ? (
              /* Success Confirmation */
              <div className="gv-success-card" data-testid="submission-success">
                <CheckCircle2 size={48} className="gv-success-icon" aria-hidden="true" />
                <h3 className="gv-success-title">Vote Confirmed</h3>
                <p className="gv-success-desc">
                  Your vote of <strong>{selectedChoice.toUpperCase()}</strong> with{' '}
                  <strong>{formatTokens(userVotingPower)}</strong> has been broadcast to the ledger.
                </p>
                {submissionSuccess.txHash && (
                  <p className="text-xs text-muted font-mono mt-1">
                    TX: {submissionSuccess.txHash}
                  </p>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="gv-btn-submit"
                    data-testid="done-button"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Form */
              <>
                <div className="gv-modal-header">
                  <h3 id={modalTitleId} className="gv-modal-title">
                    Confirm Your Vote
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    aria-label="Close vote confirmation dialog"
                    className="gv-modal-close-btn"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>

                <div className="gv-modal-body" id={modalDescId}>
                  <p className="text-sm text-muted m-0">
                    Please review your voting summary before signing this transaction.
                  </p>

                  <div className="gv-summary-table">
                    <div className="gv-summary-row">
                      <span className="gv-summary-key">Proposal</span>
                      <span className="gv-summary-val">{title}</span>
                    </div>

                    <div className="gv-summary-row">
                      <span className="gv-summary-key">Your Choice</span>
                      <span
                        className={`gv-confirm-choice-pill ${
                          selectedChoice === 'for'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : selectedChoice === 'against'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                        data-testid="confirm-choice-value"
                      >
                        {selectedChoice.toUpperCase()}
                      </span>
                    </div>

                    <div className="gv-summary-row">
                      <span className="gv-summary-key">Voting Power Committed</span>
                      <span className="gv-summary-val" data-testid="confirm-power-value">
                        {formatTokens(userVotingPower)}
                      </span>
                    </div>

                    <div className="gv-summary-row">
                      <span className="gv-summary-key">Pool Impact</span>
                      <span className="gv-summary-val">~{votingPowerPct}% of quorum</span>
                    </div>
                  </div>

                  {/* Blockchain immutability warning */}
                  <div className="gv-warning-callout">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Votes on Stellar are immutable and permanently recorded on the public ledger. Once confirmed, this choice cannot be retracted.
                    </span>
                  </div>

                  {/* Submission Error Recovery Notice */}
                  {submissionError && (
                    <div className="gv-error-callout" role="alert" data-testid="submission-error">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{submissionError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleConfirmVote}
                        className="gv-retry-btn"
                        data-testid="retry-button"
                      >
                        <RotateCcw size={12} aria-hidden="true" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                <div className="gv-modal-footer">
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeModal}
                    className="gv-btn-secondary"
                    data-testid="cancel-modal-button"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmVote}
                    className="gv-btn-submit"
                    data-testid="confirm-vote-button"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        Signing & Broadcasting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Confirm & Sign Vote
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
