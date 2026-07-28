import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { LockupClaimModal } from '../components/LockupClaimModal';
import { EmptyState } from '../components/designSystem/EmptyState';

export const DistributionDashboard: React.FC = () => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(true);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distribution Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Track RevenueShare distributions across your portfolio.
        </p>
      </div>

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.3fr_0.7fr] dark:border-slate-700 dark:bg-slate-900">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Partial unlock ready</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            A portion of your lockup has unlocked.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Investors can claim immediately, defer the action, or turn on auto-claim for the next unlock so the experience remains simple and predictable.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setIsClaimModalOpen(true)}>
              Review claim options
            </Button>
            <Link to="/investor/portal" className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              Back to discovery
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Next action</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">$12,480.00</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Available to claim with a low gas estimate and clear options for later or automatic claiming.</p>
        </div>
      </section>

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

      <LockupClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        unlockedAmount="$12,480.00"
        gasEstimate={22}
      />
    </div>
  );
};
