import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ProposalData, VoteChoice } from '../components/designSystem/GovernanceProposalDetail';
import type { ProposalAction, ProposalDraft } from '../components/GovernanceProposalForm/GovernanceProposalForm';
import type { TxStatus } from '../components/GovernanceVoteReceipt';
import { buildTransactionExplorerUrl, EXPLORER_BASE } from '../constants/stellar';

export const GOVERNANCE_PROPOSALS_STORAGE_KEY = 'revora:governance:proposals:v1';
export const GOVERNANCE_DELEGATION_STORAGE_KEY = 'revora:governance:delegation:v1';

const DEFAULT_VOTER_ADDRESS = 'GABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ56789';
const DEFAULT_VOTING_POWER = 100_000;
const DEFAULT_QUORUM_REQUIRED = 1_000_000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface VoteReceiptRecord {
  proposalId: string;
  proposalTitle: string;
  voteChoice: VoteChoice;
  votedAt: string;
  voterAddress: string;
  txHash: string;
  txStatus: TxStatus;
  explorerUrl: string;
  explorerBaseUrl: string;
  shareUrl: string;
}

export interface StoredProposal extends ProposalData {
  actions: ProposalAction[];
  createdAt: string;
  voteReceipt: VoteReceiptRecord | null;
}

export interface GovernanceProposalsContextValue {
  proposals: StoredProposal[];
  delegatedTo: string | null;
  list: () => StoredProposal[];
  getProposal: (id: string) => StoredProposal | undefined;
  create: (draft: ProposalDraft) => StoredProposal;
  vote: (proposalId: string, choice: VoteChoice, votingPower?: number) => VoteReceiptRecord | null;
  delegate: (delegateId: string | null) => void;
}

function generateTxHash(seed: string): string {
  let hash = '';
  let state = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 0x01000193);
  }
  while (hash.length < 64) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    hash += (state >>> 0).toString(16).padStart(8, '0');
  }
  return hash.slice(0, 64);
}

function createInitialProposals(): StoredProposal[] {
  const now = Date.now();
  return [
    {
      id: 'prop-001',
      title: 'Increase Protocol Treasury Allocation by 15%',
      description:
        'Allocate an additional 15% of quarterly protocol revenue to the ecosystem grants and security audit treasury.',
      proposer: 'Revora Foundation',
      status: 'active',
      endTime: now + 5 * 24 * 60 * 60 * 1000,
      quorumRequired: 2_000_000,
      quorumReached: 1_350_000,
      results: {
        for: 980_000,
        against: 250_000,
        abstain: 120_000,
      },
      participation: {
        turnout: 33.8,
        uniqueVoters: 42,
        delegates: 8,
      },
      userVote: null,
      actions: [
        {
          id: 'action-seed-1',
          type: 'parameter_change',
          paramName: 'treasuryAllocationBps',
          paramValue: '1500',
        },
      ],
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      voteReceipt: null,
    },
    {
      id: 'prop-002',
      title: 'Enable Quarterly RevenueShare Auto-Compounding',
      description:
        'Allow investors to opt into automatic reinvestment of quarterly USDC revenue payouts into eligible offerings.',
      proposer: 'Acme Corp',
      status: 'passed',
      endTime: now - 3 * 24 * 60 * 60 * 1000,
      quorumRequired: 1_500_000,
      quorumReached: 2_100_000,
      results: {
        for: 1_750_000,
        against: 250_000,
        abstain: 100_000,
      },
      participation: {
        turnout: 52.5,
        uniqueVoters: 89,
        delegates: 14,
      },
      userVote: null,
      actions: [
        {
          id: 'action-seed-2',
          type: 'text_resolution',
          description: 'Approve specification for auto-compounding revenue distributions.',
        },
      ],
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      voteReceipt: null,
    },
  ];
}

function loadStoredProposals(): StoredProposal[] {
  try {
    const raw = localStorage.getItem(GOVERNANCE_PROPOSALS_STORAGE_KEY);
    if (!raw) {
      return createInitialProposals();
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredProposal[];
    }
  } catch {
    // Fall back to initial proposals if storage is unavailable or corrupted
  }
  return createInitialProposals();
}

function saveStoredProposals(proposals: StoredProposal[]): void {
  try {
    localStorage.setItem(GOVERNANCE_PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function loadStoredDelegation(): string | null {
  try {
    const raw = localStorage.getItem(GOVERNANCE_DELEGATION_STORAGE_KEY);
    return raw || null;
  } catch {
    return null;
  }
}

function saveStoredDelegation(delegateId: string | null): void {
  try {
    if (delegateId) {
      localStorage.setItem(GOVERNANCE_DELEGATION_STORAGE_KEY, delegateId);
    } else {
      localStorage.removeItem(GOVERNANCE_DELEGATION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

const GovernanceProposalsContext = createContext<GovernanceProposalsContextValue | null>(null);

export const GovernanceProposalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proposals, setProposals] = useState<StoredProposal[]>(() => loadStoredProposals());
  const [delegatedTo, setDelegatedTo] = useState<string | null>(() => loadStoredDelegation());

  useEffect(() => {
    saveStoredProposals(proposals);
  }, [proposals]);

  useEffect(() => {
    saveStoredDelegation(delegatedTo);
  }, [delegatedTo]);

  const list = useCallback(() => proposals, [proposals]);

  const getProposal = useCallback(
    (id: string) => proposals.find((p) => p.id === id),
    [proposals],
  );

  const create = useCallback((draft: ProposalDraft): StoredProposal => {
    const now = Date.now();
    const id = `prop-${now}-${Math.random().toString(36).slice(2, 6)}`;
    const newProposal: StoredProposal = {
      id,
      title: draft.title.trim(),
      description: draft.abstract.trim(),
      proposer: 'Startup Issuer',
      status: 'active',
      endTime: now + SEVEN_DAYS_MS,
      quorumRequired: DEFAULT_QUORUM_REQUIRED,
      quorumReached: 0,
      results: {
        for: 0,
        against: 0,
        abstain: 0,
      },
      participation: {
        turnout: 0,
        uniqueVoters: 0,
        delegates: 0,
      },
      userVote: null,
      actions: draft.actions,
      createdAt: new Date(now).toISOString(),
      voteReceipt: null,
    };

    setProposals((prev) => {
      const next = [newProposal, ...prev];
      saveStoredProposals(next);
      return next;
    });

    return newProposal;
  }, []);

  const vote = useCallback(
    (proposalId: string, choice: VoteChoice, votingPower = DEFAULT_VOTING_POWER): VoteReceiptRecord | null => {
      const existing = proposals.find((p) => p.id === proposalId);
      if (!existing || existing.status !== 'active') {
        return null;
      }
      if (existing.userVote !== null) {
        return existing.voteReceipt;
      }

      const votedAt = new Date().toISOString();
      const txHash = generateTxHash(`${proposalId}:${choice}:${votedAt}:${votingPower}`);
      const explorerBaseUrl = `${EXPLORER_BASE}/tx/`;
      const explorerUrl = buildTransactionExplorerUrl(txHash) ?? `${explorerBaseUrl}${txHash}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.revora.io';
      const shareUrl = `${origin}/startup/governance/proposals/${proposalId}?receipt=${txHash.slice(0, 12)}`;

      const receipt: VoteReceiptRecord = {
        proposalId,
        proposalTitle: existing.title,
        voteChoice: choice,
        votedAt,
        voterAddress: DEFAULT_VOTER_ADDRESS,
        txHash,
        txStatus: 'confirmed',
        explorerUrl,
        explorerBaseUrl,
        shareUrl,
      };

      setProposals((prev) => {
        const next = prev.map((p) => {
          if (p.id !== proposalId) return p;
          const updatedResults = {
            ...p.results,
            [choice]: p.results[choice] + votingPower,
          };
          const updatedQuorumReached = p.quorumReached + votingPower;
          const updatedVoters = p.participation.uniqueVoters + 1;
          const updatedDelegates = p.participation.delegates + (delegatedTo ? 1 : 0);
          const totalSupplyProxy = Math.max(p.quorumRequired * 2, updatedQuorumReached);
          const updatedTurnout = Number(
            Math.min(100, (updatedQuorumReached / totalSupplyProxy) * 100).toFixed(1),
          );

          return {
            ...p,
            quorumReached: updatedQuorumReached,
            results: updatedResults,
            participation: {
              turnout: updatedTurnout,
              uniqueVoters: updatedVoters,
              delegates: updatedDelegates,
            },
            userVote: choice,
            voteReceipt: receipt,
          };
        });
        saveStoredProposals(next);
        return next;
      });

      return receipt;
    },
    [proposals, delegatedTo],
  );

  const delegate = useCallback((delegateId: string | null) => {
    setDelegatedTo(delegateId);
    saveStoredDelegation(delegateId);
  }, []);

  const value = useMemo<GovernanceProposalsContextValue>(
    () => ({
      proposals,
      delegatedTo,
      list,
      getProposal,
      create,
      vote,
      delegate,
    }),
    [proposals, delegatedTo, list, getProposal, create, vote, delegate],
  );

  return (
    <GovernanceProposalsContext.Provider value={value}>
      {children}
    </GovernanceProposalsContext.Provider>
  );
};

export function useGovernanceProposals(): GovernanceProposalsContextValue {
  const ctx = useContext(GovernanceProposalsContext);
  if (!ctx) {
    throw new Error('useGovernanceProposals must be used within a GovernanceProposalsProvider');
  }
  return ctx;
}

export function useOptionalGovernanceProposals(): GovernanceProposalsContextValue | null {
  return useContext(GovernanceProposalsContext);
}
