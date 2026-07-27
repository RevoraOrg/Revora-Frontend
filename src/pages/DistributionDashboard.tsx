import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';
import { DocumentUploadStatus } from '../components/DocumentUploadStatus';

export const DistributionDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distribution Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Track RevenueShare distributions across your portfolio.
        </p>
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
