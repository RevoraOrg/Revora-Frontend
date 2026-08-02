import React from 'react';
import { Link } from 'react-router-dom';
import { TokenSupplyBlock } from '../components/TokenSupplyBlock/TokenSupplyBlock';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

const RECENT_UPLOADS = [
  { name: 'Q3_Revenue_Report.pdf', status: 'Uploaded 2 hours ago' },
  { name: 'malicious_payload.exe', status: 'Blocked for security review' },
];

const ISSUER_RATES = [
  { id: 'issuer-acme', label: 'Nexus Cloud Series A', value: '2.4%', trend: 'decreasing' },
  { id: 'issuer-nexus', label: 'AeroDynamics Fund II', value: '4.1%', trend: 'increasing' },
  { id: 'issuer-aero', label: 'StellarTech Ventures', value: '1.2%', trend: 'decreasing' },
  { id: 'issuer-stellar', label: 'Quantum Labs', value: '3.7%', trend: 'increasing' },
];

const REGION_RATES = [
  { id: 'region-na', label: 'North America', value: '2.8%', trend: 'decreasing' },
  { id: 'region-eu', label: 'Europe', value: '1.9%', trend: 'increasing' },
  { id: 'region-apac', label: 'Asia Pacific', value: '3.5%', trend: 'decreasing' },
  { id: 'region-latam', label: 'Latin America', value: '2.1%', trend: 'increasing' },
];

export const DistributionDashboard: React.FC = () => {
  const totalDistributed = 1560000;
  const activePayouts = 4;
  const totalGasSpent = 342.5;
  const pendingRetries = 2;
const SAMPLE_TILES: AdminTileData[] = [
  {
    id: 'api-latency',
    label: 'API Latency',
    value: '42ms',
    status: 'healthy',
    detail: 'Avg response time – p95 under 100ms',
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
  endTime: Date.now() + 86_400_000 * 3,
  quorumRequired: 4_000_000,
  quorumReached: 2_500_000,
  results: { for: 2_000_000, against: 450_000, abstain: 50_000 },
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

  const filteredPayouts = useMemo(() => {
    return payoutsList.filter((p) => {
      const search = filterState.searchQuery.toLowerCase();
      if (
        search &&
        !p.id.toLowerCase().includes(search) &&
        !p.offeringName.toLowerCase().includes(search) &&
        !p.payoutNumber.toLowerCase().includes(search)
      ) {
        return false;
      }

      if (
        filterState.issuer !== 'all' &&
        filterState.issuer !== 'All Issuers' &&
        p.offeringName !== filterState.issuer
      ) {
        return false;
      }

      if (
        filterState.region !== 'all' &&
        filterState.region !== 'All Regions' &&
        p.region !== filterState.region
      ) {
        return false;
      }

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

  const segmentedData = useMemo(() => {
    const effectiveSegment =
      filterState.segmentBy !== 'none'
        ? filterState.segmentBy
        : filterState.compareMode
        ? 'region'
        : 'none';

    if (effectiveSegment === 'none') return null;

    const groups: {
      [key: string]: { count: number; totalDistributed: number; payouts: ExtendedPayoutDetail[] };
    } = {};

    filteredPayouts.forEach((p) => {
      let key = 'Other';
      if (effectiveSegment === 'region') key = p.region || 'Other';
      if (effectiveSegment === 'offering') key = p.offeringName;
      if (effectiveSegment === 'status') key = p.status.toUpperCase();
      if (effectiveSegment === 'tier') key = p.tier || 'Standard';

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

  const totalDistributed = useMemo(() => {
    return filteredPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  }, [filteredPayouts]);

  const totalGasSpent = useMemo(() => {
    return filteredPayouts.reduce((sum, p) => sum + p.gasFeeUsd, 0);
  }, [filteredPayouts]);

  const failedCount = useMemo(() => {
    return filteredPayouts.filter((p) => p.status === 'failed').length;
  }, [filteredPayouts]);

  const activePayouts = useMemo(() => {
    return filteredPayouts.filter((p) => p.status === 'processing' || p.status === 'scheduled').length;
  }, [filteredPayouts]);

  const pendingRetries = useMemo(() => {
    return filteredPayouts.reduce((sum, p) => sum + p.retries.filter((r) => r.status === 'failed').length, 0);
  }, [filteredPayouts]);

  const handlePreopenOptIn = useCallback(() => {
    console.log('User opted in for redemption window reminder');
  }, []);

  const handlePreopenDismiss = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Distribution Dashboard</h1>
        <p className="text-muted text-sm">
          Monitor and audit on-chain RevenueShare payout cycles across your portfolio.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="glass-card px-4 py-2 flex flex-col items-start">
          <span className="text-xs text-muted uppercase">Delegated Power</span>
          <span className="text-sm font-bold text-white">0 VP</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/startup/report-revenue" className="payout-btn-primary">
            + Report Monthly Revenue
          </a>
          <Link to="/investor/portal" className="text-sm text-primary hover:text-primary-hover">
            Back to Discovery
          </Link>
        </div>
      </div>

      <section className="glass-card p-6" aria-labelledby="token-supply-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 id="token-supply-heading" className="text-xl font-semibold">
            Token Supply Configuration
          </h2>
          <span className="text-xs uppercase tracking-wide text-muted">Live preview</span>
        </div>
      {/* Filter Toolbar */}
      <DistributionFilterToolbar
        filters={filterState}
        onFilterChange={updateFiltersAndUrl}
        onResetFilters={handleResetFilters}
      />

      <section aria-labelledby="governance-proposal-heading" className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Governance</p>
            <h2 id="governance-proposal-heading" className="text-xl font-semibold text-white">
              Proposal Detail
            </h2>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            Review quorum, support, and the latest vote distribution before casting your decision.
          </p>
        </div>
        <GovernanceProposalDetail proposal={GOVERNANCE_PROPOSAL} />
      </section>

      <section aria-labelledby="upload-queue-heading" className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Documents</p>
            <h2 id="upload-queue-heading" className="text-xl font-semibold text-white">
              Batch Upload Queue
            </h2>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            Track each document’s progress, retry failures, and remove completed or cancelled files.
          </p>
        </div>
        <UploadQueue
          queue={queue}
          onAddFiles={addFiles}
          onRemove={removeFile}
          onRetry={handleRetry}
          onUploadAll={handleUploadAll}
          onClearComplete={clearComplete}
          totalCount={totalCount}
          successCount={successCount}
          errorCount={errorCount}
          uploadingCount={uploadingCount}
          overallProgress={overallProgress}
          uploader={undefined}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        />
      </section>

      {/* Token Supply Configuration */}
      <div className="mt-8">
        <TokenSupplyBlock />
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list" aria-label="Distribution key metrics">
        <div role="listitem" data-testid="kpi-total-distributed">
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Total Distributed</span>
            <span className="text-2xl font-bold tracking-tight">${totalDistributed.toLocaleString('en-US')}</span>
          </div>
        </div>
        <div role="listitem" data-testid="kpi-active-payouts">
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Active Payouts</span>
            <span className="text-2xl font-bold tracking-tight">{activePayouts}</span>
          </div>
        </div>
        <div role="listitem" data-testid="kpi-gas-spent">
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Gas Spent</span>
            <span className="text-2xl font-bold tracking-tight">${totalGasSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div role="listitem" data-testid="kpi-pending-retries">
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Pending Retries</span>
            <span className="text-2xl font-bold tracking-tight">{pendingRetries}</span>
          </div>
        </div>
      </div>

      <section className="glass-card p-6" aria-labelledby="uploads-heading">
        <h2 id="uploads-heading" className="text-xl font-semibold mb-4">Recent Uploads Queue</h2>
        <ul className="space-y-3" aria-label="Recent uploads queue">
          {RECENT_UPLOADS.map((upload) => (
            <li key={upload.name} className="flex items-center justify-between rounded border border-slate-700/70 bg-slate-950/40 px-4 py-3">
              <span className="font-medium text-white">{upload.name}</span>
              <span className="text-sm text-muted">{upload.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="error-rate-heading" data-testid="error-rate-section">
        <div className="flex items-center justify-between mb-4">
          <h2 id="error-rate-heading" className="text-xl font-semibold">
            Payout Error Rates
          </h2>
          <Link to="/startup/distributions?status=failed" className="text-xs text-primary hover:text-primary-hover transition-colors" data-testid="error-rate-view-all">
            View all failed →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-5" data-testid="error-rate-by-issuer">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">By Issuer</h3>
            <ul className="space-y-3" aria-label="Error rates by issuer">
              {ISSUER_RATES.map((item) => {
                const href = `/startup/distributions?issuer=${encodeURIComponent(item.label)}&status=failed`;

                return (
                  <li key={item.id} className="rounded border border-slate-700/70 bg-slate-950/40 px-3 py-3">
                    <a href={href} className="flex items-center justify-between gap-3" data-testid={`error-rate-tile-${item.id}`}>
                      <span className="text-sm text-white">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <svg
                          width="48"
                          height="20"
                          viewBox="0 0 48 20"
                          role="img"
                          aria-label={item.trend}
                          className="text-amber-300"
                        >
                          <path
                            d={item.trend === 'increasing' ? 'M2 14 L16 10 L24 12 L38 4 L46 8' : 'M2 10 L16 14 L24 12 L38 16 L46 12'}
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-amber-300">{item.value}</span>
                      </div>
                    </a>
                    <p className="mt-2 text-xs text-muted">Issuer: {item.label}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="glass-card p-5" data-testid="error-rate-by-region">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">By Region</h3>
            <ul className="space-y-3" aria-label="Error rates by region">
              {REGION_RATES.map((item) => {
                const href = `/startup/distributions?region=${encodeURIComponent(item.label)}&status=failed`;

                return (
                  <li key={item.id} className="rounded border border-slate-700/70 bg-slate-950/40 px-3 py-3">
                    <a href={href} className="flex items-center justify-between gap-3" data-testid={`error-rate-tile-${item.id}`}>
                      <span className="text-sm text-white">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <svg
                          width="48"
                          height="20"
                          viewBox="0 0 48 20"
                          role="img"
                          aria-label={item.trend}
                          className="text-amber-300"
                        >
                          <path
                            d={item.trend === 'increasing' ? 'M2 14 L16 10 L24 12 L38 4 L46 8' : 'M2 10 L16 14 L24 12 L38 16 L46 12'}
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-amber-300">{item.value}</span>
                      </div>
                    </a>
                    <p className="mt-2 text-xs text-muted">Region: {item.label}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="glass-card p-6" aria-labelledby="governance-results-heading">
        <h2 id="governance-results-heading" className="text-xl font-semibold mb-3">Results Breakdown</h2>
        <p className="text-sm text-muted">68.4% turnout across the current governance cycle.</p>
      {/* Governance Delegation */}
      <div className="mt-8">
        <GovernanceDelegation />
      </div>

      {/* Governance Results Breakdown */}
      <div className="mt-12">
        <GovernanceResults
          results={{ for: 124, against: 58, abstain: 18 }}
          participation={{ turnout: 63.5, uniqueVoters: 200, delegates: 12 }}
          status="passed"
        />
      </div>

      {/* Financial terms wizard step */}
      <section aria-labelledby="financial-terms-heading">
        <h2
          id="financial-terms-heading"
          style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-md)' }}
        >
          Configure Offering Terms
        </h2>
        <div className="glass-card" style={{ padding: 'var(--spacing-xl)' }}>
          <FinancialTermsForm
            onSubmit={(values: Record<FinancialTermsField, number>) => {
              // Replace with real API call
              console.log('Financial terms submitted:', values);
            }}
          />
        </div>
      </section>

      <section className="glass-card p-6" aria-labelledby="distributions-heading">
        <h2 id="distributions-heading" className="text-xl font-semibold mb-3">Distributions</h2>
        <p className="text-sm text-muted">No distributions yet</p>
      </section>
    </main>
  );
};
