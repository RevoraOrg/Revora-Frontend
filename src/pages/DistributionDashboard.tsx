import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';
import { GovernanceResults } from '../components/designSystem/GovernanceResults';
import { DocumentUploadStatus } from '../components/DocumentUploadStatus';
import type { DistributionFilterState } from '../components/DistributionFilterToolbar/DistributionFilterToolbar.types';
import type { PayoutDetail, RecipientItem, RetryEvent } from '../components/PayoutDrillDownPanel/PayoutDrillDownPanel.types';
import { ErrorRateSparklineTile } from '../components/ErrorRateSparklineTile/ErrorRateSparklineTile';
import type { ErrorRateDataPoint } from '../components/ErrorRateSparklineTile/ErrorRateSparklineTile';

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
    executionNetwork: 'Stellar', blockNumber: 8912345, contractAddress: '0x…789A', transactionHash: '0x…DEF0',
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
      { label: 'W3', value: 1.3 }, { label: 'W4', value: 1.2 },
    ],
    filterValue: 'StellarTech Ventures',
  },
  {
    id: 'issuer-stellar', title: 'ERROR RATE', value: '3.7%', rate: 3.7, delta: 0.5,
    sparklineData: [
      { label: 'W1', value: 3.2 }, { label: 'W2', value: 3.4 },
      { label: 'W3', value: 3.6 }, { label: 'W4', value: 3.7 },
    ],
    filterValue: 'Quantum Labs',
  },
];

const ERROR_RATE_BY_REGION: Array<{
  id: string; title: string; value: string; rate: number; delta: number;
  sparklineData: ErrorRateDataPoint[]; filterValue: string;
}> = [
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
      { label: 'W3', value: 2.0 }, { label: 'W4', value: 1.9 },
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

export const DistributionDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filter state from URL search params
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

  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(
    searchParams.get('payoutId')
  );
  const [payoutsList, setPayoutsList] = useState<ExtendedPayoutDetail[]>(MOCK_PAYOUTS);

  const rowRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Sync state changes to URL search params
  const updateFiltersAndUrl = useCallback(
    (newState: DistributionFilterState) => {
      setFilterState(newState);

      const params: Record<string, string> = {};
      if (newState.searchQuery) params.search = newState.searchQuery;
      if (newState.dateRange !== 'all') params.date = newState.dateRange;
      if (newState.issuer !== 'all') params.issuer = newState.issuer;
      if (newState.region !== 'all') params.region = newState.region;
      if (newState.status !== 'all') params.status = newState.status;
      if (newState.segmentBy !== 'none') params.segment = newState.segmentBy;
      if (newState.compareMode) params.compare = 'true';
      if (selectedPayoutId) params.payoutId = selectedPayoutId;

      setSearchParams(params);
    },
    [selectedPayoutId, setSearchParams]
  );

  const handleResetFilters = useCallback(() => {
    const defaultState: DistributionFilterState = {
      searchQuery: '',
      dateRange: 'all',
      issuer: 'all',
      region: 'all',
      status: 'all',
      segmentBy: 'none',
      compareMode: false,
    };
    updateFiltersAndUrl(defaultState);
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
                timestamp: new Date().toISOString(),
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
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Wallet,Name,Tier,Share%,Amount,Status']
        .concat(
          payout.recipients.map(
            (r) =>
              `${r.walletAddress},${r.name || ''},${r.tier},${r.sharePercentage},${r.amount},${r.status}`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${payout.id}_recipients.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter dataset based on all active filters
  const filteredPayouts = useMemo(() => {
    return payoutsList.filter((p) => {
      // Search
      const search = filterState.searchQuery.toLowerCase();
      if (
        search &&
        !p.id.toLowerCase().includes(search) &&
        !p.offeringName.toLowerCase().includes(search) &&
        !p.payoutNumber.toLowerCase().includes(search)
      ) {
        return false;
      }

      // Issuer
      if (
        filterState.issuer !== 'all' &&
        filterState.issuer !== 'All Issuers' &&
        p.offeringName !== filterState.issuer
      ) {
        return false;
      }

      // Region
      if (
        filterState.region !== 'all' &&
        filterState.region !== 'All Regions' &&
        p.region !== filterState.region
      ) {
        return false;
      }

      // Status
      if (
        filterState.status !== 'all' &&
        filterState.status !== 'All Statuses' &&
        p.status !== filterState.status
      ) {
        return false;
      }

      return true;
    });
  }, [payoutsList, filterState]);

  // Segmented Groups calculation (for compare mode or segmented view)
  const segmentedData = useMemo(() => {
    const effectiveSegment =
      filterState.segmentBy !== 'none'
        ? filterState.segmentBy
        : filterState.compareMode
        ? 'region'
        : 'none';

    if (effectiveSegment === 'none') return null;

    const groups: { [key: string]: { count: number; totalDistributed: number; payouts: ExtendedPayoutDetail[] } } = {};

    filteredPayouts.forEach((p) => {
      let key = 'Other';
      if (effectiveSegment === 'region') key = p.region;
      if (effectiveSegment === 'offering') key = p.offeringName;
      if (effectiveSegment === 'status') key = p.status.toUpperCase();

      if (!groups[key]) {
        groups[key] = { count: 0, totalDistributed: 0, payouts: [] };
      }
      groups[key].count += 1;
      groups[key].totalDistributed += p.netAmount;
      groups[key].payouts.push(p);
    });

    return groups;
  }, [filteredPayouts, filterState.segmentBy, filterState.compareMode]);

  const selectedPayoutData = useMemo(() => {
    return payoutsList.find((p) => p.id === selectedPayoutId) || null;
  }, [payoutsList, selectedPayoutId]);

  // Aggregate summary metrics
  const totalDistributed = useMemo(() => {
    return filteredPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  }, [filteredPayouts]);

  const totalGasSpent = useMemo(() => {
    return filteredPayouts.reduce((sum, p) => sum + p.gasFeeUsd, 0);
  }, [filteredPayouts]);

  const failedCount = useMemo(() => {
    return filteredPayouts.filter((p) => p.status === 'failed').length;
  }, [filteredPayouts]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Distribution Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Monitor and audit on-chain RevenueShare payout cycles across your portfolio.
          </p>
        </div>

        <a href="/startup/report-revenue" className="payout-btn-primary self-start md:self-auto">
          + Report Monthly Revenue
        </a>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Uploads Queue</h2>
        <div className="space-y-4">
          <DocumentUploadStatus
            fileName="Q3_Revenue_Report.pdf"
            status="clean"
          />
          <DocumentUploadStatus
            fileName="Financial_Audit_2023.pdf"
            status="scanning"
          />
          <DocumentUploadStatus
            fileName="K-1_Distribution_Schedule.xlsx"
            status="validating"
          />
          <DocumentUploadStatus
            fileName="Unrecognized_Document.docx"
            status="quarantined"
            auditNote="Flagged for manual review due to missing digital signature."
            remediationUrl="/support/documents/quarantine"
          />
          <DocumentUploadStatus
            fileName="malicious_payload.exe"
            status="rejected"
            auditNote="Malware signature detected. Upload blocked."
          />
        </div>
      </div>

      {/* ── Payout Error Rate Sparkline Tiles ── */}
      <section aria-labelledby="error-rate-heading" data-testid="error-rate-section">
        <div className="flex items-center justify-between mb-4">
          <h2 id="error-rate-heading" className="text-xl font-semibold">
            Payout Error Rates
          </h2>
          <Link
            to="/startup/distributions?status=failed"
            className="text-xs text-primary hover:text-primary-hover transition-colors"
            data-testid="error-rate-view-all"
          >
            View all failed →
          </Link>
        </div>

        <div className="space-y-6">
          {/* By Issuer */}
          <div data-testid="error-rate-by-issuer">
            <h3 className="text-sm font-medium text-muted mb-3 uppercase tracking-wide">
              By Issuer
            </h3>
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              role="list"
              aria-label="Error rates by issuer"
            >
              {ERROR_RATE_BY_ISSUER.map((item) => (
                <div role="listitem" key={item.id}>
                  <ErrorRateSparklineTile
                    id={item.id}
                    title={item.title}
                    value={item.value}
                    rate={item.rate}
                    delta={item.delta}
                    sparklineData={item.sparklineData}
                    groupBy="issuer"
                    filterValue={item.filterValue}
                    href={`/startup/distributions?issuer=${encodeURIComponent(item.filterValue)}&status=failed`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* By Region */}
          <div data-testid="error-rate-by-region">
            <h3 className="text-sm font-medium text-muted mb-3 uppercase tracking-wide">
              By Region
            </h3>
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              role="list"
              aria-label="Error rates by region"
            >
              {ERROR_RATE_BY_REGION.map((item) => (
                <div role="listitem" key={item.id}>
                  <ErrorRateSparklineTile
                    id={item.id}
                    title={item.title}
                    value={item.value}
                    rate={item.rate}
                    delta={item.delta}
                    sparklineData={item.sparklineData}
                    groupBy="region"
                    filterValue={item.filterValue}
                    href={`/startup/distributions?region=${encodeURIComponent(item.filterValue)}&status=failed`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <GovernanceResults
        results={{ for: 2500000, against: 450000, abstain: 50000 }}
        participation={{ turnout: 68.4, uniqueVoters: 142, delegates: 12 }}
        status="passed"
      />

      <EmptyState
        variant="distribution-dashboard"
        title="No distributions yet"
        description="When revenue is reported and payouts are processed, your distribution history will appear here."
        primaryAction={{
          label: 'Report Revenue',
          href: '/startup/report-revenue',
        }}
        secondaryAction={{
          label: 'Back to Discovery',
          href: '/investor/portal',
        }}
      />
    </div>
  );
};

