import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';

export const AuditTrail: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted text-sm mt-1">
          Complete activity log for compliance and transparency.
        </p>
      </div>

      <EmptyState
        variant="audit-trail"
        title="No audit trail entries"
        description="Activity logs will appear here as transactions and events occur on the platform."
        primaryAction={{
          label: 'Refresh',
          onClick: () => window.location.reload(),
        }}
        secondaryAction={{
          label: 'Back to Discovery',
          href: '/investor/portal',
        }}
      />
    </div>
  );
};
