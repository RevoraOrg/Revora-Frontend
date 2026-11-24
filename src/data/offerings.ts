import type { LockupSchedule } from '../components/LockupStatusCard/LockupStatusCard';

export interface Offering {
  id: number;
  name: string;
  category: string;
  revenueShare: number;
  target: number;
  raised: number;
}

export interface OfferingProspectus extends Offering {
  description: string;
  highlights: string[];
  termLength: number;
  minInvestment: number;
  riskLevel: 'low' | 'medium' | 'high';
  state: 'funding-open' | 'pre-open' | 'closed';
  redemptionOpensAt?: string;
  lockup?: LockupSchedule;
}

// Sample data only: shared by discovery and the investor prospectus.
export const MOCK_OFFERINGS: OfferingProspectus[] = [
  {
    id: 1, name: 'TechFlow AI', category: 'Enterprise SaaS',
    revenueShare: 15, target: 250000, raised: 112500,
    description: 'TechFlow AI provides AI-driven workflow automation for enterprise teams.',
    highlights: ['Recurring subscription revenue', 'Expanding into the EU market'],
    termLength: 36, minInvestment: 1000, riskLevel: 'low', state: 'funding-open',
    lockup: {
      totalLocked: 150000, unlockedAmount: 0,
      cliffEndAt: '2027-11-01T00:00:00Z', vestingEndAt: '2029-11-01T00:00:00Z',
      phases: [
        { id: 'cliff', kind: 'cliff', label: 'Cliff',
          description: 'The cliff portion unlocks after twelve months.',
          startAt: '2026-11-01T00:00:00Z', endAt: '2027-11-01T00:00:00Z', amount: 60000 },
        { id: 'vesting', kind: 'vesting', label: 'Linear vesting',
          description: 'The remaining shares unlock through the vesting period.',
          startAt: '2027-11-01T00:00:00Z', endAt: '2029-11-01T00:00:00Z', amount: 90000 },
      ],
    },
  },
  {
    id: 2, name: 'Quantum Ledger', category: 'DeFi Infrastructure',
    revenueShare: 12, target: 500000, raised: 140000,
    description: 'Quantum Ledger builds infrastructure for decentralized financial applications.',
    highlights: ['Infrastructure service revenue', 'Developer tooling for financial applications'],
    termLength: 24, minInvestment: 500, riskLevel: 'high', state: 'pre-open',
    redemptionOpensAt: '2027-12-01T00:00:00Z',
  },
  {
    id: 3, name: 'Nexus Pay', category: 'Cross-Border Payments',
    revenueShare: 18, target: 300000, raised: 186000,
    description: 'Nexus Pay develops cross-border payment services for businesses.',
    highlights: ['Transaction-based revenue', 'Business payment integrations'],
    termLength: 30, minInvestment: 750, riskLevel: 'medium', state: 'closed',
  },
];
