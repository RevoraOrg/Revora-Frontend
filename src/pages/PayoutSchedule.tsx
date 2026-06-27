import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';

export const PayoutSchedule: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payout Schedule</h1>
        <p className="text-muted text-sm mt-1">
          View upcoming and past RevenueShare payout dates.
        </p>
      </div>

      <EmptyState
        variant="payout-schedule"
        title="No payouts scheduled"
        description="Payouts will appear here once revenue is reported and the distribution cycle begins."
        primaryAction={{
          label: 'Report Revenue',
          href: '/startup/report-revenue',
        }}
        secondaryAction={{
          label: 'Learn How It Works',
          href: '/',
        }}
      />
    </div>
  );
};
