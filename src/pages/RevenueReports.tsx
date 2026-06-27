import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';

export const RevenueReports: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue Reports</h1>
        <p className="text-muted text-sm mt-1">
          Monthly revenue submissions and payout estimates.
        </p>
      </div>

      <EmptyState
        variant="revenue-reports"
        title="No revenue reports yet"
        description="Submit your first monthly revenue report to start generating payout estimates and distributions."
        primaryAction={{
          label: 'Submit Revenue Report',
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
