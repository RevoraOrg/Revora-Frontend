import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRight, CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react';
import { useGovernanceProposals } from '../context/GovernanceProposalsContext';
import type { ProposalStatus } from '../components/designSystem/GovernanceProposalDetail';

const STATUS_META: Record<ProposalStatus, { label: string; icon: React.ReactNode }> = {
  active: { label: 'Active', icon: <Clock size={14} aria-hidden="true" /> },
  passed: { label: 'Passed', icon: <CheckCircle2 size={14} aria-hidden="true" /> },
  rejected: { label: 'Rejected', icon: <XCircle size={14} aria-hidden="true" /> },
  quorum_failed: { label: 'Quorum Failed', icon: <MinusCircle size={14} aria-hidden="true" /> },
};

export const GovernanceProposalsPage: React.FC = () => {
  const { list, delegatedTo } = useGovernanceProposals();
  const proposals = list();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
            Governance Proposals
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
            Review active proposals, cast your vote, or delegate your voting power.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <Link to="/startup/governance/delegation" className="btn btn-secondary">
            <Users size={16} aria-hidden="true" />
            {delegatedTo ? 'Manage Delegation' : 'Delegate Power'}
          </Link>
          <Link to="/startup/governance/proposals/create" className="btn btn-primary">
            <Plus size={16} aria-hidden="true" />
            New Proposal
          </Link>
        </div>
      </header>

      {proposals.length === 0 ? (
        <div className="glass-card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
          <p className="text-muted">No governance proposals yet.</p>
          <Link to="/startup/governance/proposals/create" className="btn btn-primary">
            Create the first proposal
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--spacing-md)' }}>
          {proposals.map((proposal) => {
            const meta = STATUS_META[proposal.status];
            const totalVotes =
              proposal.results.for + proposal.results.against + proposal.results.abstain;
            return (
              <li key={proposal.id} className="glass-card" style={{ padding: 'var(--spacing-lg)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-md)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      {meta.icon}
                      <span>{meta.label}</span>
                      {proposal.userVote && (
                        <span className="text-muted">· Voted {proposal.userVote}</span>
                      )}
                    </div>
                    <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-xl)' }}>
                      <Link
                        to={`/startup/governance/proposals/${proposal.id}`}
                        className="link-styled"
                      >
                        {proposal.title}
                      </Link>
                    </h2>
                    <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                      {proposal.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {new Intl.NumberFormat('en-US').format(totalVotes)} votes ·{' '}
                      {proposal.participation.uniqueVoters} voters
                    </span>
                    <Link
                      to={`/startup/governance/proposals/${proposal.id}`}
                      className="btn btn-secondary"
                      aria-label={`View proposal ${proposal.title}`}
                    >
                      View Details
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default GovernanceProposalsPage;
