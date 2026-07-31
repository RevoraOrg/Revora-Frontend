import React, { useState } from 'react';
import { DelegateSearch } from './DelegateSearch';
import { DelegateProfileCard, DelegateData } from './DelegateProfileCard';
import { DelegationConfirmDialog, RevokeConfirmDialog } from './DelegationDialogs';
import { DelegatedPowerHeader } from './DelegatedPowerHeader';
import './GovernanceDelegation.css';

const MOCK_DELEGATES: Record<string, DelegateData> = {
  'del-1': { id: 'del-1', name: 'Alice Voter', address: '0x1234567890abcdef1234567890abcdef12345678', participationRate: 98, voteAlignment: 85, totalDelegated: 1500000, expertiseTags: ['Treasury', 'Security', 'Ecosystem'], bio: 'Long-standing community member with deep expertise in treasury management and protocol security. Voted on every proposal since genesis.', totalProposalsVoted: 47, avgResponseTimeHours: 2.5, delegatorCount: 234, voteHistory: [{ proposalId: 'prop-47', proposalTitle: 'Increase Protocol Treasury Allocation by 15%', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-28T14:15:00Z' }, { proposalId: 'prop-46', proposalTitle: 'Update Security Council Members', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-21T09:30:00Z' }, { proposalId: 'prop-45', proposalTitle: 'Reduce Governance Quorum to 3M VP', voteChoice: 'against', alignedWithOutcome: false, votedAt: '2026-07-14T16:45:00Z' }, { proposalId: 'prop-44', proposalTitle: 'New Ecosystem Grant Program', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-07T11:00:00Z' }, { proposalId: 'prop-43', proposalTitle: 'Validator Stake Increase to 10K', voteChoice: 'abstain', alignedWithOutcome: true, votedAt: '2026-06-30T13:20:00Z' }] },
  'del-2': { id: 'del-2', name: 'Bob Stake', address: '0x87654321fedcba0987654321fedcba0987654321', participationRate: 92, voteAlignment: 70, totalDelegated: 800000, expertiseTags: ['Infrastructure', 'Scalability'], bio: 'Infrastructure engineer focused on scaling solutions. Regular contributor to node software and performance improvements.', totalProposalsVoted: 38, avgResponseTimeHours: 8, delegatorCount: 89, voteHistory: [{ proposalId: 'prop-47', proposalTitle: 'Increase Protocol Treasury Allocation by 15%', voteChoice: 'against', alignedWithOutcome: false, votedAt: '2026-07-29T10:00:00Z' }, { proposalId: 'prop-46', proposalTitle: 'Update Security Council Members', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-22T14:00:00Z' }, { proposalId: 'prop-45', proposalTitle: 'Reduce Governance Quorum to 3M VP', voteChoice: 'against', alignedWithOutcome: false, votedAt: '2026-07-15T09:00:00Z' }] },
  'del-3': { id: 'del-3', name: 'Charlie Node', address: '0xABCDEF0123456789ABCDEF0123456789ABCDEF01', participationRate: 100, voteAlignment: 95, totalDelegated: 3200000, expertiseTags: ['Governance', 'Research', 'Community'], bio: 'Governance researcher with a 100% participation record. Known for thoughtful deliberation and community-first approach.', totalProposalsVoted: 47, avgResponseTimeHours: 1.2, delegatorCount: 567, voteHistory: [{ proposalId: 'prop-47', proposalTitle: 'Increase Protocol Treasury Allocation by 15%', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-28T08:00:00Z' }, { proposalId: 'prop-46', proposalTitle: 'Update Security Council Members', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-21T07:30:00Z' }, { proposalId: 'prop-45', proposalTitle: 'Reduce Governance Quorum to 3M VP', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-14T10:00:00Z' }, { proposalId: 'prop-44', proposalTitle: 'New Ecosystem Grant Program', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-07T09:00:00Z' }] },
  'del-4': { id: 'del-4', name: 'Diana Chain', address: '0xFEEDBEEFFEEDBEEFFEEDBEEFFEEDBEEFFEEDBEEF', participationRate: 75, voteAlignment: 55, totalDelegated: 450000, expertiseTags: ['Marketing', 'Partnerships'], bio: 'Marketing and ecosystem growth specialist. Active in partnership development and community outreach.', totalProposalsVoted: 22, avgResponseTimeHours: 24, delegatorCount: 34, voteHistory: [{ proposalId: 'prop-47', proposalTitle: 'Increase Protocol Treasury Allocation by 15%', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-30T20:00:00Z' }, { proposalId: 'prop-46', proposalTitle: 'Update Security Council Members', voteChoice: 'against', alignedWithOutcome: false, votedAt: '2026-07-23T18:00:00Z' }] },
  'del-5': { id: 'del-5', name: 'Evan Block', address: '0xC0DECAFEC0DECAFEC0DECAFEC0DECAFEC0DECAFE', participationRate: 88, voteAlignment: 82, totalDelegated: 1200000, expertiseTags: ['DeFi', 'Tokenomics'], bio: 'DeFi strategist with strong background in tokenomics and liquidity design.', totalProposalsVoted: 35, avgResponseTimeHours: 4.5, delegatorCount: 156, voteHistory: [{ proposalId: 'prop-47', proposalTitle: 'Increase Protocol Treasury Allocation by 15%', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-28T12:00:00Z' }, { proposalId: 'prop-46', proposalTitle: 'Update Security Council Members', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-21T11:00:00Z' }, { proposalId: 'prop-45', proposalTitle: 'Reduce Governance Quorum to 3M VP', voteChoice: 'for', alignedWithOutcome: true, votedAt: '2026-07-14T14:00:00Z' }] },
};

const USER_VOTING_POWER = 250000;
const USER_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const noop = () => {};

export const GovernanceDelegation: React.FC = () => {
  const [selectedDelegateId, setSelectedDelegateId] = useState<string | null>(null);
  const [currentDelegatedId, setCurrentDelegatedId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedDelegate = selectedDelegateId ? MOCK_DELEGATES[selectedDelegateId] : null;
  const currentDelegate = currentDelegatedId ? MOCK_DELEGATES[currentDelegatedId] : null;
  const isSelf = selectedDelegateId ? selectedDelegate?.address.toLowerCase() === USER_ADDRESS.toLowerCase() : false;

  /* All callback functions extracted as named constants */
  const openConfirm = () => setIsConfirmOpen(true);
  const closeConfirm = () => setIsConfirmOpen(false);
  const openRevoke = () => setIsRevokeOpen(true);
  const closeRevoke = () => setIsRevokeOpen(false);

  const handleDelegateConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setCurrentDelegatedId(selectedDelegateId);
      setIsConfirmOpen(false);
      setIsProcessing(false);
      setToastMessage(`Voting power delegated to ${selectedDelegate?.name}`);
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  };

  const handleRevokeConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const name = currentDelegate?.name;
      setCurrentDelegatedId(null);
      setSelectedDelegateId(null);
      setIsRevokeOpen(false);
      setIsProcessing(false);
      setToastMessage(`Delegation revoked from ${name}`);
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  };

  const hasActiveVotes = currentDelegatedId !== null;
  const activeProposalCount = currentDelegatedId ? 2 : 0;

  return (
    <section className="governance-delegation" aria-labelledby="delegation-heading">
      <div className="gd-section-header">
        <h2 id="delegation-heading" className="gd-section-title">Governance Delegation</h2>
        <p className="gd-section-subtitle text-muted">
          Search for a delegate, review their track record, and assign your voting power with confidence.
        </p>
      </div>

      <DelegatedPowerHeader
        isDelegated={currentDelegatedId !== null}
        delegateName={currentDelegate?.name}
        delegateAddress={currentDelegate?.address}
        votingPower={USER_VOTING_POWER}
        delegatedSince={currentDelegatedId ? '2 weeks ago' : undefined}
        onRevokeClick={openRevoke}
        isSelfDelegated={currentDelegatedId !== null && currentDelegate?.address.toLowerCase() === USER_ADDRESS.toLowerCase()}
      />

      {toastMessage && (
        <div className="gd-toast animate-fade-in" role="status" aria-live="polite" data-testid="toast">
          {toastMessage}
        </div>
      )}

      <div className="delegation-grid">
        <div className="delegation-search-col">
          <DelegateSearch onSelectDelegate={setSelectedDelegateId} userAddress={USER_ADDRESS} />
        </div>
        <div className="delegation-profile-col">
          {selectedDelegate && !isSelf ? (
            <div style={{ position: 'relative' }}>
              <DelegateProfileCard delegate={selectedDelegate} isDelegated={currentDelegatedId === selectedDelegate.id} onDelegateClick={openConfirm} onRevokeClick={openRevoke} isSelf={false} />
              {isProcessing && (
                <div className="gd-processing-overlay" aria-label="Processing delegation" role="status">
                  <span className="gd-processing-spinner animate-spin-loader" style={{ width: 32, height: 32, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block' }} />
                  <span className="gd-processing-text">Processing…</span>
                </div>
              )}
            </div>
          ) : selectedDelegate && isSelf ? (
            <DelegateProfileCard delegate={selectedDelegate} isDelegated={false} onDelegateClick={noop} onRevokeClick={noop} isSelf={true} />
          ) : currentDelegatedId ? (
            <DelegateProfileCard delegate={MOCK_DELEGATES[currentDelegatedId]} isDelegated={true} onDelegateClick={noop} onRevokeClick={openRevoke} isSelf={MOCK_DELEGATES[currentDelegatedId].address.toLowerCase() === USER_ADDRESS.toLowerCase()} />
          ) : (
            <div className="empty-profile-state glass-card text-muted" data-testid="empty-profile">
              <p>Select a delegate to view their profile, track record, and vote history.</p>
            </div>
          )}
        </div>
      </div>

      {selectedDelegate && !isSelf && (
        <DelegationConfirmDialog isOpen={isConfirmOpen} onClose={closeConfirm} onConfirm={handleDelegateConfirm} delegateName={selectedDelegate.name} delegateAddress={selectedDelegate.address} votingPower={USER_VOTING_POWER} loading={isProcessing} />
      )}

      <RevokeConfirmDialog isOpen={isRevokeOpen} onClose={closeRevoke} onConfirm={handleRevokeConfirm} delegateName={currentDelegate?.name} hasActiveVotes={hasActiveVotes} activeProposalCount={activeProposalCount} loading={isProcessing} />
    </section>
  );
};

GovernanceDelegation.displayName = 'GovernanceDelegation';
export default GovernanceDelegation;
