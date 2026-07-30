import React from 'react';
import { Link } from 'react-router-dom';
import { TokenSupplyBlock } from '../components/TokenSupplyBlock/TokenSupplyBlock';

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
      </section>

      <section className="glass-card p-6" aria-labelledby="distributions-heading">
        <h2 id="distributions-heading" className="text-xl font-semibold mb-3">Distributions</h2>
        <p className="text-sm text-muted">No distributions yet</p>
      </section>
    </main>
  );
};
