import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Link, useSearchParams, useBlocker, useNavigate } from 'react-router-dom';
import { AdminHero } from '../components/AdminHero';
import type { AdminTileData, IncidentData } from '../components/AdminHero';
import { Button } from '../components/Button';
import { LockupClaimModal } from '../components/LockupClaimModal';
import { EmptyState } from '../components/designSystem/EmptyState';
import { KycResubmissionTimeline } from '../components/KycResubmissionTimeline';
import { GovernanceResults } from '../components/designSystem/GovernanceResults';
import { DocumentUploadStatus } from '../components/DocumentUploadStatus';
import type { DistributionFilterState } from '../components/DistributionFilterToolbar/DistributionFilterToolbar.types';
import type { PayoutDetail, RecipientItem, RetryEvent } from '../components/PayoutDrillDownPanel/PayoutDrillDownPanel.types';
import { ErrorRateSparklineTile } from '../components/ErrorRateSparklineTile/ErrorRateSparklineTile';
import type { ErrorRateDataPoint } from '../components/ErrorRateSparklineTile/ErrorRateSparklineTile';
import { GovernanceDelegation } from '../components/GovernanceDelegation/GovernanceDelegation';
import { RevenuePayoutChart, RevenuePayoutDataPoint } from '../components/RevenuePayoutChart/RevenuePayoutChart';
import { BlacklistBulkRemoveConfirm, BlacklistEntry } from '../components/BlacklistBulkRemoveConfirm/BlacklistBulkRemoveConfirm';
import { GovernanceProposalDetail, type ProposalData } from '../components/designSystem/GovernanceProposalDetail';
import { UploadQueue } from '../components/UploadQueue/UploadQueue';
import { useUploadQueue, type Uploader } from '../hooks/useUploadQueue';
import { DistributionFilterToolbar } from '../components/DistributionFilterToolbar';
import { PayoutDrillDownPanel } from '../components/PayoutDrillDownPanel';

interface ExtendedPayoutDetail extends PayoutDetail {
  region: string;
}

const MOCK_RECIPIENTS_BASE: RecipientItem[] = [
  { id: 'r1', walletAddress: 'GA…abcd', name: 'Alice', tier: 'Gold', sharePercentage: 40, amount: 40000, status: 'success', gasAllocatedGwei: 18 },
  { id: 'r2', walletAddress: 'GB…ef01', name: 'Bob', tier: 'Silver', sharePercentage: 30, amount: 30000, status: 'success', gasAllocatedGwei: 18 },
  { id: 'r3', walletAddress: 'GC…2345', name: 'Carol', tier: 'Bronze', sharePercentage: 20, amount: 20000, status: 'success', gasAllocatedGwei: 18 },
  { id: 'r4', walletAddress: 'GD…6789', name: 'Dave', tier: 'Bronze', sharePercentage: 10, amount: 10000, status: 'pending', gasAllocatedGwei: 18 },
];

const MOCK_RETRIES: RetryEvent[] = [
  { id: 'ret-1', timestamp: '2026-07-20T10:00:00Z', attemptNumber: 1, status: 'failed', reason: 'Gas estimation underrun.', gasUsedGwei: 21 },
  { id: 'ret-2', timestamp: '2026-07-21T14:30:00Z', attemptNumber: 2, status: 'success', reason: 'Retry with adjusted gas.', gasUsedGwei: 22 },
];

const MOCK_PAYOUTS: ExtendedPayoutDetail[] = [
  {
    id: 'PO-2026-004', payoutNumber: 'PO-2026-004', date: '2026-07-15', time: '14:30 UTC',
    status: 'completed', grossAmount: 105000, netAmount: 100000, protocolFeeUsd: 5000,
    currency: 'USDC', offeringName: 'Nexus Cloud Series A', offeringId: 'off-nexus-001',
    gasFeeUsd: 42.50, gasFeeEth: 0.018, gasPriceGwei: 22, estimatedGasUsd: 45, estimatedGasPriceGwei: 24,
    executionNetwork: 'Stellar', blockNumber: 8912345, contractAddress: '0x…789A', transactionHash: '0x…DEF2',
    recipientsCount: 4, recipients: MOCK_RECIPIENTS_BASE, retries: [],
    region: 'North America', nextPayoutDate: '2026-08-15', nextPayoutEstimateUsd: 105000, nextPayoutLink: '/startup/distributions?payoutId=PO-2026-005',
  },
  {
    id: 'PO-2026-003', payoutNumber: 'PO-2026-003', date: '2026-07-10', time: '09:15 UTC',
    status: 'failed', grossAmount: 82000, netAmount: 78000, protocolFeeUsd: 4000,
    currency: 'USDC', offeringName: 'AeroDynamics Fund II', offeringId: 'off-aero-002',
    gasFeeUsd: 38.20, gasFeeEth: 0.016, gasPriceGwei: 21, estimatedGasUsd: 40, estimatedGasPriceGwei: 23,
    executionNetwork: 'Stellar', blockNumber: 8901234, contractAddress: '0x…456B', transactionHash: '0x…789C',
    recipientsCount: 4, recipients: MOCK_RECIPIENTS_BASE, retries: MOCK_RETRIES,
    region: 'Europe', nextPayoutDate: '2026-08-10', nextPayoutEstimateUsd: 85000, nextPayoutLink: '/startup/distributions?payoutId=PO-2026-005',
  },
];

const MOCK_REVENUE_PAYOUT_DATA: RevenuePayoutDataPoint[] = [
  { period: 'Jan', revenue: 95000, payout: 90000 },
  { period: 'Feb', revenue: 110000, payout: 105000 },
  { period: 'Mar', revenue: 105000, payout: 95000 },
  { period: 'Apr', revenue: 125000, payout: 115000 },
  { period: 'May', revenue: 140000, payout: 130000 },
  { period: 'Jun', revenue: 135000, payout: 125000 },
];

const ERROR_RATE_BY_ISSUER: Array<{
  id: string; title: string; value: string; rate: number; delta: number;
  sparklineData: ErrorRateDataPoint[]; filterValue: string;
}> = [
  {
    id: 'issuer-acme', title: 'ERROR RATE', value: '2.4%', rate: 2.4, delta: -0.8,
    sparklineData: [
      { label: 'W1', value: 3.2 }, { label: 'W2', value: 2.8 },
      { label: 'W3', value: 3.5 }, { label: 'W4', value: 2.4 },
    ],
    filterValue: 'Nexus Cloud Series A',
  },
  {
    id: 'issuer-nexus', title: 'ERROR RATE', value: '4.1%', rate: 4.1, delta: 1.2,
    sparklineData: [
      { label: 'W1', value: 2.9 }, { label: 'W2', value: 3.3 },
      { label: 'W3', value: 3.8 }, { label: 'W4', value: 4.1 },
    ],
    filterValue: 'AeroDynamics Fund II',
  },
  {
    id: 'issuer-aero', title: 'ERROR RATE', value: '1.2%', rate: 1.2, delta: -0.3,
    sparklineData: [
      { label: 'W1', value: 1.5 }, { label: 'W2', value: 1.8 },
      { label: 'W2', value: 1.3 }, { label: 'W4', value: 1.2 },
    ],
    filterValue: 'StellarTech Ventures',
  },
  {
    id: 'issuer-stellar', title: 'ERROR RATE', value: '3.7%', rate: 3.7, delta: 0.5,
    sparklineData: [
      { label: 'W1', value: 3.2 }, { label: 'W2', value: 3.4 },
      { label: 'W2', value: 3.6 }, { label: 'W4', value: 3.7 },
    ],
    filterValue: 'Quantum Labs',
  },
];

const ERROR_RATE_BY_REGION: Array<[
  {
    id: string; title: string; value: string; rate: number; delta: number;
    sparklineData: ErrorRateDataPoint[]; filterValue: string;
  }
]> = [
  {
    id: 'region-na', title: 'ERROR RATE', value: '2.8%', rate: 2.8, delta: 0.4,
    sparklineData: [
      { label: 'W1', value: 2.4 }, { label: 'W2', value: 2.6 },
      { label: 'W3', value: 2.7 }, { label: 'W4', value: 2.8 },
    ],
    filterValue: 'North America',
  },
  {
    id: 'region-eu', title: 'ERROR RATE', value: '1.9%', rate: 1.9, delta: -0.6,
    sparklineData: [
      { label: 'W1', value: 2.5 }, { label: 'W2', value: 2.3 },
      { label: 'W2', value: 2.0 }, { label: 'W4', value: 1.9 },
    ],
    filterValue: 'Europe',
  },
  {
    id: 'region-apac', title: 'ERROR RATE', value: '3.5%', rate: 3.5, delta: 0.9,
    sparklineData: [
      { label: 'W1', value: 2.6 }, { label: 'W2', value: 2.9 },
      { label: 'W3', value: 3.2 }, { label: 'W4', value: 3.5 },
    ],
    filterValue: 'Asia Pacific',
  },
  {
    id: 'region-latam', title: 'ERROR RATE', value: '2.1%', rate: 2.1, delta: -0.2,
    sparklineData: [
      { label: 'W1', value: 2.3 }, { label: 'W2', value: 2.2 },
      { label: 'W3', value: 2.2 }, { label: 'W4', value: 2.1 },
    ],
    filterValue: 'Latin America',
  },
];

const SAMPLE_TILES: AdminTileData[] = [
  {
    id: 'api-latency',
    label: 'API Latency',
    value: '42ms',
    status: 'healthy',
    detail: 'Avg response time - p95 under 100ms',
    href: '/admin/api-latency',
  },
  {
    id: 'relay-health',
    label: 'On-Chain Relay',
    value: 'Connected',
    status: 'healthy',
    detail: 'Last confirmed block: 2s ago',
    href: '/admin/relay-health',
  },
  {
    id: 'open-alerts',
    label: 'Open Alerts',
    value: '3',
    status: 'degraded',
    detail: '2 medium, 1 low severity',
    href: '/admin/alerts',
  },
  {
    id: 'compliance-holds',
    label: 'Compliance Holds',
    value: '1',
    status: 'outage',
    detail: 'Identity reverification required for investor KYB-042',
    href: '/admin/compliance',
  },
];

const SAMPLE_INCIDENT: IncidentData | null = null;

const GOVERNANCE_PROPOSAL: ProposalData = {
  id: 'prop-1',
  title: 'Increase Developer Grant Fund',
  description:
    'A proposal to allocate an additional 500,000 tokens to the developer grant program to support ecosystem growth and accelerate protocol contributor onboarding.',
  proposer: '0x1234...abcd',
  status: 'active',
  endTime: Date.now() + 864000000 * 3,
  quorumRequired: 4,000,000,
  quorumReached: 2,500,000,
  results: { for: 2,000,000, against: 450,000, abstain: 50,000 },
  participation: { turnout: 68.4, uniqueVoters: 142, delegates: 12 },
  userVote: null,
};

const mockUploader: Uploader = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const total = 100;
    const tick = () => {
      const next = Math.min(total, progress + 20);
      progress = next;
      onProgress(next);
      if (next >= total) {
        resolve();
      } else {
        window.setTimeout(tick, 120);
      }
    };

    let progress = 0;
    if (file.name.toLowerCase().includes('fail')) {
      reject(new Error('Network unavailable'));
      return;
    }

    window.setTimeout(tick, 120);
  });
};

const DEFAULT_FILTER_STATE: DistributionFilterState = {
  searchQuery: '',
  dateRange: 'all',
  issuer: 'all',
  region: 'all',
  status: 'all',
  segmentBy: 'none',
  compareMode: false,
};

export const DistributionDashboard: React.FC = () => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(true);
  const [isBulkRemoveModalOpen, setIsBulkRemoveModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const preopenTargetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(9, 0, 0, 0);
    return d;
  }, []);

  const [filterState, setFilterState] = useState<DistributionFilterState>(() => {
    return {
      searchQuery: searchParams.get('search') || '',
      dateRange: (searchParams.get('date') as any) || 'all',
      issuer: searchParams.get('issuer') || 'all',
      region: searchParams.get('region') || 'all',
      status: searchParams.get('status') || 'all',
      segmentBy: (searchParams.get('segment') as any) || 'none',
      compareMode: searchParams.get('compare') === 'true',
    };
  });

  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [payoutsList, setPayoutsList] = useState<ExtendedPayoutDetail[]>(MOCK_PAYOUTS);
  const { files, uploadFiles, retryFile } = useUploadQueue();
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const blocker = useBlocker(hasUnsavedChanges);

  const dialogRef = useRef<HTMLDivRef>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);

  const updateFiltersAndUrl = useCallback((newState: DistributionFilterState) => {
    setFilterState(newState);
    const params = new URLSearchParams();
    if (newState.searchQuery) params.set('search', newState.searchQuery);
    if (newState.dateRange !== 'all') params.set('date', newState.dateRange);
    if (newState.issuer !== 'all') params.set('issuer', newState.issuer);
    if (newState.region !== 'all') params.set('region', newState.region);
    if (newState.status !== 'all') params.set('status', newState.status);
    if (newState.segmentBy !== 'none') params.set('segment', newState.segmentBy);
    if (newState.compareMode) params.set('compare', 'true');
    setSearchParams(params);
    setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(DEFAULT_FILTER_STATE));
  }, [setSearchParams ]);

  const handleFilterChange = useCallback((patch: Partial<DistributionFilterState>) => {
    const newState = { ...filterState, ...patch };
    updateFiltersAndUrl(newState);
  }, [filterState, updateFiltersAndUrl]);

  const handleUploadAll = useCallback(() => {
    uploadFiles(mockUploader);
  }, [uploadFiles]);

  const handleRetry = useCallback(
    (id: string, uploader: Uploader) => {
      retryFile(id, uploader);
    },
    [retryFile],
  );

  const handleResetFilters = useCallback(() => {
    updateFiltersAndUrl(DEFAULT_FILTER_STATE);
  }, [updateFiltersAndUrl]);

  const handleOpenPanel = (id: string) => {
    setSelectedPayoutId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('payoutId', id);
    setSearchParams(newParams);
  };

  const handleClosePanel = () => {
    setSelectedPayoutId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('payoutId');
    setSearchParams(newParams);
  };

  const handleRetryBatch = (payoutId: string) => {
    setPayoutsList((prev) =>
      prev.map((p) => {
        if (p.id === payoutId) {
          return {
            ...p,
            status: 'processing',
            retries: [
              ...p.retries,
              {
                id: `ret-${Date.now()}`,
                timestamp: new Date().toISSString(),
                attemptNumber: p.retries.length + 1,
                status: 'success',
                reason: 'Ops staff triggered retry dispatch.',
                gasUsedGwei: 22.0,
              },
            ],
          };
        }
        return p;
      })
    );
  };

  const handleExportCsv = (payoutId: string) => {
    const payout = payoutsList.find((p) => p.id === payoutId);
    if (!payout) return;
    const csvContent = [
      ['Field', 'Value'],
      ['Payout ID', payout.id],
      ['Date', payout.date],
      ['Time', payout.time],
      ['Status', payout.status],
      ['Gross Amount', String(payout.grossAmount)],
      ['Net Amount', String(payout.netAmount)],
      ['Protocol Fee (USD)', String(payout.protocolFeeUsd)],
      ['Currency', payout.currency],
      ['Offering Name', payout.offeringName],
      ['Execution Network', payout.executionNetwork],
      ['Block Number', String(payout.blockNumber)],
      ['Transaction Hash', payout.transactionHash],
      ['Recipients Count', String(payout.recipientsCount)],
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectUUL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout-${payoutId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Effect for browser refresh/close with unsaved changes
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Open modal when blocked by router
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setIsExitConfirmOpen(true);
    }
  }, [blocker.state]);

  // Focus trap for the dialog
  useEffect(() => {
    if (isExitConfirmOpen) {
      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusableElements?[0];
      const last = focusableElements?[focusableElements.length - 1];
      stayButtonRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (!focusableElements || focusableElements.length === 0) return;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
        if (e.key === 'Escape') {
          handleStay();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExitConfirmOpen]);

  const handleSaveAndExit = () => {
    // Mock save action. In a real implementation, this would persist the wizard state.
    setHasUnsavedChanges(false);
    setIsExitConfirmOpen(false);
    if (blocker.proceed) blocker.proceed();
  };

  const handleDiscard = () => {
    setHasUnsavedChanges(false);
    setIsExitConfirmOpen(false);
    if (blocker.proceed) blocker.proceed();
  };

  const handleStay = () => {
    setIsExitConfirmOpen(false);
    if (blocker.reset) blocker.reset();
  };

  return (
    <div className="distribution-dashboard">
      {!bannerDismissed && (
        <div className="banner" role="status">
          <span>Pre-open target: {preopenTargetDate.toLocaleString()}</span>
          <Button variant="ghost" onClick={() => setBannerDismissed(true)}>Dismiss</Button>
        </div>
      )}
      <AdminHero
        title="Distribution Dashboard"
        subtitle="Monitor and manage distributions"
        tiles={SAMPLE_TILES}
        incident={SAMPLE_INCIDENT}
      />
      <DistributionFilterToolbar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      <div className="metrics-grid">
        <div className="error-rate-grid">
          {ERROR_RATE_BY_ISSUER.map((tile) => (
            <ErrorRateSparklineTile
              key={tile.id}
              title={tile.title}
              value={tile.value}
              rate={tile.rate}
              delta={tile.delta}
              sparklineData={tile.sparklineData}
            />
          ))}
        </div>
        <RevenuePayoutChart data={MOCK_REVENUE_PAYOUT_DATA} />
      </div>
      <div className="governance-panels">
        <GovernanceDelegation />
        <GovernanceResults />
        <KycResubmissionTimeline />
        <DocumentUploadStatus />
      </div>
      <UploadQueue
        files={files}
        onUploadAll={handleUploadAll}
        onRetry={handleRetry}
      />
      {isBulkRemoveModalOpen && (
        <BlacklistBulkRemoveConfirm
          isOpen={isBulkRemoveModalOpen}
          onClose={() => setIsBulkRemoveModalOpen(false)}
        />
      )}
      {selectedPayoutId && (
        <PayoutDrillDownPanel
          payout={payoutsList.find((p) => p.id === selectedPayoutId)}
          onClose={handleClosePanel}
          onRetryBatch={handleRetryBatch}
          onExportCsv={handleExportCsv}
        />
      )}
      <LockupClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
      />
      <GovernanceProposalDetail proposal={GOVERNANCE_PROPOSAL} />
      {isExitConfirmOpen && (
        <div className="modal-overlay" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-confirm-title"
            aria-describedby="exit-confirm-description"
            ref={dialogRef}
          >
            <h2 id="exit-confirm-title">Unsaved changes</h2>
            <p id="exit-confirm-description">
              You have unsaved changes. If you leave, your progress may be lost.
            </p>
            <div className="confirm-actions">
              <Button variant="primary" onClick={handleSaveAndExit}>
                Save and Exit
              </Button>
              <Button variant="danger" onClick={handleDiscard}>
                Discard
              </Button>
              <button
                ref={stayButtonRef}
                className="button-secondary"
                onClick={handleStay}
              ~
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
