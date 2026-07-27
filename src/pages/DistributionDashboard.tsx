import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';
import { RedemptionBanner } from '../components/RedemptionBanner';

export const DistributionDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distribution Dashboard</h1>
        <p className="text-muted text-sm mt-1 mb-8">
          Track RevenueShare distributions across your portfolio.
        </p>
        <RedemptionBanner totalCapacity={10000} currentSubscription={12500} />
      </div>

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
