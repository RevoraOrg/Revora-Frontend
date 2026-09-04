import type { GovernanceProposal } from './types';

const NOW = Date.now();
const ONE_HOUR = 3600 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export const mockGovernanceProposals: GovernanceProposal[] = [
  {
    id: 'prop-101',
    title: 'Increase Quarterly Revenue Share Allocation to 18%',
    description:
      'Proposal to increase the revenue-share distribution pool from 15% to 18% for Q4 2026, funded from treasury surplus following EU market expansion milestones.',
    proposer: 'GD7X...9K2M',
    category: 'Treasury & Payouts',
    status: 'active',
    startTime: NOW - 2 * ONE_DAY,
    endTime: NOW + 3 * ONE_DAY + 4 * ONE_HOUR,
    quorumRequired: 400000,
    quorumReached: 512000,
    totalVotingWeight: 1000000,
    tally: {
      forVotes: 360000,
      againstVotes: 112000,
      abstainVotes: 40000,
    },
    userVote: null,
    userVotingPower: 12500,
    discussionUrl: 'https://community.revora.finance/p/101',
  },
  {
    id: 'prop-102',
    title: 'Adopt Multi-Sig Treasury Settlement Protocol for Distributions',
    description:
      'Mandates a 3-of-5 threshold signer arrangement on Stellar for all quarterly revenue distributions exceeding $50,000 USDC.',
    proposer: 'GAK4...3B1P',
    category: 'Security & Compliance',
    status: 'pre_voting',
    startTime: NOW + 1 * ONE_DAY + 12 * ONE_HOUR,
    endTime: NOW + 8 * ONE_DAY,
    quorumRequired: 500000,
    quorumReached: 0,
    totalVotingWeight: 1000000,
    tally: {
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
    },
    userVote: null,
    userVotingPower: 12500,
    discussionUrl: 'https://community.revora.finance/p/102',
  },
  {
    id: 'prop-100',
    title: 'Ratify Q2 2026 Audit Report and Reserve Validation',
    description:
      'Ratification of independent financial and smart contract audit conducted by CertiK and Grant Thornton.',
    proposer: 'GB5Y...8F4Q',
    category: 'Audit & Governance',
    status: 'passed',
    startTime: NOW - 10 * ONE_DAY,
    endTime: NOW - 3 * ONE_DAY,
    quorumRequired: 350000,
    quorumReached: 620000,
    totalVotingWeight: 1000000,
    tally: {
      forVotes: 580000,
      againstVotes: 25000,
      abstainVotes: 15000,
    },
    userVote: 'for',
    userVotingPower: 12500,
    transactionHash: '0x9fa4...382e',
  },
  {
    id: 'prop-099',
    title: 'Emergency Liquidity Pool Rebalancing to EU Baskets',
    description:
      'Proposed immediate liquidity shift to EU currency pairs prior to regulatory clarity.',
    proposer: 'GC2L...1N9S',
    category: 'Liquidity',
    status: 'quorum_failed',
    startTime: NOW - 15 * ONE_DAY,
    endTime: NOW - 7 * ONE_DAY,
    quorumRequired: 600000,
    quorumReached: 180000,
    totalVotingWeight: 1000000,
    tally: {
      forVotes: 140000,
      againstVotes: 30000,
      abstainVotes: 10000,
    },
    userVote: null,
    userVotingPower: 12500,
  },
];
