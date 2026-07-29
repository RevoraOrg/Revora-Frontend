import React from 'react';
import { Link } from 'react-router-dom';
import { AdminHero } from '../components/AdminHero';
import type { AdminTileData, IncidentData } from '../components/AdminHero';
import { EmptyState } from '../components/designSystem/EmptyState';

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

export const DistributionDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <AdminHero
        tiles={SAMPLE_TILES}
        incident={SAMPLE_INCIDENT}
        onDismissIncident={(id) => {
          console.log('Dismissed incident:', id);
        }}
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
