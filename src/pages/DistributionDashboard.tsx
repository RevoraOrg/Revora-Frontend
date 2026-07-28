import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/designSystem/EmptyState';
import { AuditNoteEditor } from '../components/AuditNoteEditor';

export const DistributionDashboard: React.FC = () => {
  const [showAuditNote, setShowAuditNote] = useState(false);
  const [auditNote, setAuditNote] = useState('');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Distribution Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Track RevenueShare distributions across your portfolio.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowAuditNote((prev) => !prev)}
          aria-expanded={showAuditNote}
          aria-controls="ane-editor-panel"
        >
          {showAuditNote ? 'Close Audit Note' : 'Add Audit Note'}
        </button>
      </div>

      {showAuditNote && (
        <div id="ane-editor-panel">
          <AuditNoteEditor
            value={auditNote}
            onChange={setAuditNote}
          />
        </div>
      )}

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
