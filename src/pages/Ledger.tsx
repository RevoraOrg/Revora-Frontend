import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';

export const Ledger: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
        <p className="text-muted text-sm mt-1">
          Detailed transaction history and ledger entries.
        </p>
      </div>

      <EmptyState
        variant="ledger"
        title="No ledger entries"
        description="Transaction records will appear here as RevenueShare events are processed on-chain."
        primaryAction={{
          label: 'Back to Discovery',
          href: '/investor/portal',
        }}
        secondaryAction={{
          label: 'View Portfolio',
          href: '/investor/portfolio',
        }}
      />
    </div>
  );
};
