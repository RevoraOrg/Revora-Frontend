import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt, Users } from 'lucide-react';
import {
  GovernanceProposalDetail,
  type VoteChoice,
} from '../components/designSystem/GovernanceProposalDetail';
import { GovernanceResults } from '../components/designSystem/GovernanceResults';
import { GovernanceVoteReceipt } from '../components/GovernanceVoteReceipt';
import {
  useGovernanceProposals,
  type StoredProposal,
  type VoteReceiptRecord,
} from '../context/GovernanceProposalsContext';

function deriveResultsStatus(proposal: StoredProposal): 'passed' | 'rejected' | 'quorum_failed' {
  if (proposal.status !== 'active') {
    return proposal.status;
  }
  if (proposal.quorumReached < proposal.quorumRequired) {
    return 'quorum_failed';
  }
  return proposal.results.for >= proposal.results.against ? 'passed' : 'rejected';
}

export const GovernanceProposalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getProposal, vote } = useGovernanceProposals();
  const [activeReceipt, setActiveReceipt] = useState<VoteReceiptRecord | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const proposal = id ? getProposal(id) : undefined;

  if (!proposal) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
        <div className="glass-card" style={{ padding: 'var(--spacing-xl)' }}>
          <h1 style={{ marginTop: 0 }}>Proposal not found</h1>
          <p className="text-muted">
            We could not find a governance proposal with ID <code>{id}</code>.
          </p>
          <Link to="/startup/governance/proposals" className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Proposals
          </Link>
        </div>
      </div>
    );
  }

  const receipt = activeReceipt ?? proposal.voteReceipt;

  const handleVote = (choice: VoteChoice) => {
    const issued = vote(proposal.id, choice);
    if (issued) {
      setActiveReceipt(issued);
      setIsReceiptOpen(true);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
      <nav
        aria-label="Governance navigation"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/startup/governance/proposals"
          className="link-styled"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Proposals
        </Link>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          {receipt && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReceiptOpen(true)}
            >
              <Receipt size={16} aria-hidden="true" />
              View Vote Receipt
            </button>
          )}
          <Link to="/startup/governance/delegation" className="btn btn-secondary">
            <Users size={16} aria-hidden="true" />
            Delegation
          </Link>
        </div>
      </nav>

      <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
        <GovernanceProposalDetail proposal={proposal} onVote={handleVote} />
        <GovernanceResults
          results={proposal.results}
          participation={proposal.participation}
          status={deriveResultsStatus(proposal)}
        />
      </div>

      {receipt && (
        <GovernanceVoteReceipt
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          proposalTitle={receipt.proposalTitle}
          proposalId={receipt.proposalId}
          voteChoice={receipt.voteChoice}
          votedAt={receipt.votedAt}
          voterAddress={receipt.voterAddress}
          txHash={receipt.txHash}
          txStatus={receipt.txStatus}
          currentConfirmations={12}
          targetConfirmations={12}
          explorerBaseUrl={receipt.explorerBaseUrl}
          shareUrl={receipt.shareUrl}
        />
      )}
    </div>
  );
};

export default GovernanceProposalDetailPage;
