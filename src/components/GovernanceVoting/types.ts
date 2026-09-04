/**
 * Type definitions for Governance Voting UI (Issue #629).
 */

export type ProposalStatus =
  | 'pre_voting'
  | 'active'
  | 'passed'
  | 'rejected'
  | 'quorum_failed';

export type VoteChoice = 'for' | 'against' | 'abstain';

export interface VoteTally {
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  category?: string;
  status: ProposalStatus;
  startTime: number;
  endTime: number;
  quorumRequired: number;
  quorumReached: number;
  totalVotingWeight: number;
  tally: VoteTally;
  userVote: VoteChoice | null;
  userVotingPower: number;
  discussionUrl?: string;
  transactionHash?: string;
}

export interface VoteSubmissionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp?: number;
}

export interface GovernanceVotingProps {
  /** The currently selected proposal or default offering proposal */
  proposal?: GovernanceProposal;
  /** Available proposals for this offering */
  proposals?: GovernanceProposal[];
  /** Callback when user successfully casts a vote */
  onVoteSubmit?: (
    proposalId: string,
    choice: VoteChoice,
    votingPower: number
  ) => Promise<VoteSubmissionResult> | VoteSubmissionResult;
  /** Compact or mobile layout override */
  compact?: boolean;
  /** Optional container class */
  className?: string;
}
