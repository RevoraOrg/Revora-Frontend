/**
 * DocumentReplacementDemo — Issue #449
 *
 * A demonstration page for the DocumentReplacementFlow wizard and the
 * VersionHistoryDropdown component. Accessible at route:
 *   /startup/document-replacement
 *
 * Showcases:
 * - Full 4-step replacement wizard (Upload → Review → Confirm → Done)
 * - Side-by-side version compare with diff summary
 * - "Keep both" vs "Replace" toggle
 * - Version history dropdown for navigating prior versions
 * - Large PDF and mismatched-format edge cases
 * - Mobile-first responsive layout
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentReplacementFlow } from '../components/DocumentReplacementFlow';
import { VersionHistoryDropdown } from '../components/DocumentReplacementFlow/VersionHistoryDropdown';
import type {
  DocumentVersion,
  DiffSummary,
} from '../components/DocumentReplacementFlow';
import { ArrowLeft, FileText } from 'lucide-react';

/* ─── Mock data ────────────────────────────────────────────────── */

const MOCK_OLD_VERSION: DocumentVersion = {
  id: 'ver-001',
  versionLabel: 'v1 (original)',
  fileName: 'prospectus-nexus-cloud.pdf',
  fileType: 'PDF',
  fileSizeBytes: 2_457_600, // 2.4 MB
  uploadedBy: { id: 'user-alice', name: 'Alice Mwangi', email: 'alice@nexus.io' },
  uploadedAt: '2026-01-15T09:30:00Z',
  sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  pageCount: 24,
  notes: 'Initial regulatory filing.',
};

const MOCK_NEW_VERSION: DocumentVersion = {
  id: 'ver-002',
  versionLabel: 'v2 (amended)',
  fileName: 'prospectus-nexus-cloud-amended.pdf',
  fileType: 'PDF',
  fileSizeBytes: 2_764_800, // 2.7 MB
  uploadedBy: { id: 'user-bob', name: 'Bob Okafor', email: 'bob@nexus.io' },
  uploadedAt: '2026-07-28T14:15:00Z',
  sha256: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
  pageCount: 27,
  notes: 'Amended terms per regulator feedback, Q2 2026.',
};

const MOCK_LARGE_OLD: DocumentVersion = {
  id: 'ver-lg-001',
  versionLabel: 'v1',
  fileName: 'full-audit-dataset.csv',
  fileType: 'CSV',
  fileSizeBytes: 52_428_800, // 50 MB
  uploadedBy: { id: 'user-alice', name: 'Alice Mwangi', email: 'alice@nexus.io' },
  uploadedAt: '2026-05-01T08:00:00Z',
  lineCount: 180_000,
  sha256: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
};

const MOCK_MISMATCH_OLD: DocumentVersion = {
  id: 'ver-mm-001',
  versionLabel: 'v1',
  fileName: 'financial-model.xlsx',
  fileType: 'XLSX',
  fileSizeBytes: 512_000,
  uploadedBy: { id: 'user-carol', name: 'Carol Adeyemi', email: 'carol@nexus.io' },
  uploadedAt: '2026-03-10T11:00:00Z',
  sha256: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
};

const MOCK_DIFF: DiffSummary = {
  bytesAdded: 307_200,
  bytesRemoved: 0,
  linesAdded: undefined,
  linesRemoved: undefined,
  pagesAdded: 3,
  pagesRemoved: 0,
  highConfidenceMatch: true,
  summaryText: '307.2 KB added · 3 pages added',
  fieldsChanged: [
    { name: 'Revenue share %', oldValue: '8.5%', newValue: '7.0%' },
    { name: 'Lock-up period', oldValue: '18 months', newValue: '12 months' },
    { name: 'Min investment', oldValue: '$10,000', newValue: '$5,000' },
  ],
};

const ALL_VERSIONS: DocumentVersion[] = [
  { ...MOCK_NEW_VERSION },
  {
    id: 'ver-001',
    versionLabel: 'v1 (original)',
    fileName: 'prospectus-nexus-cloud.pdf',
    fileType: 'PDF',
    fileSizeBytes: 2_457_600,
    uploadedBy: { id: 'user-alice', name: 'Alice Mwangi', email: 'alice@nexus.io' },
    uploadedAt: '2026-01-15T09:30:00Z',
    sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    pageCount: 24,
  },
];

/* ─── Scenario types ───────────────────────────────────────────── */

type Scenario = 'standard' | 'large-pdf' | 'mismatched-format' | 'preloaded';

const SCENARIO_LABELS: Record<Scenario, string> = {
  standard: 'Standard PDF replacement',
  'large-pdf': 'Large CSV (50 MB)',
  'mismatched-format': 'Mismatched format (XLSX → PDF)',
  preloaded: 'Pre-loaded new version',
};

/* ─── Page component ───────────────────────────────────────────── */

export const DocumentReplacementDemo: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>('standard');
  const [activeVersionId, setActiveVersionId] = useState<string>(MOCK_NEW_VERSION.id);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);

  const scenarioConfig = (): {
    oldVersion: DocumentVersion;
    initialNewVersion: DocumentVersion | null;
    initialDiff: DiffSummary | null;
    documentName: string;
  } => {
    switch (scenario) {
      case 'large-pdf':
        return {
          oldVersion: MOCK_LARGE_OLD,
          initialNewVersion: null,
          initialDiff: null,
          documentName: 'Full Audit Dataset',
        };
      case 'mismatched-format':
        return {
          oldVersion: MOCK_MISMATCH_OLD,
          initialNewVersion: null,
          initialDiff: null,
          documentName: 'Financial Model',
        };
      case 'preloaded':
        return {
          oldVersion: MOCK_OLD_VERSION,
          initialNewVersion: MOCK_NEW_VERSION,
          initialDiff: MOCK_DIFF,
          documentName: 'Nexus Cloud Prospectus',
        };
      default:
        return {
          oldVersion: MOCK_OLD_VERSION,
          initialNewVersion: null,
          initialDiff: null,
          documentName: 'Nexus Cloud Prospectus',
        };
    }
  };

  const { oldVersion, initialNewVersion, initialDiff, documentName } =
    scenarioConfig();

  // Reset confirmation result when scenario changes
  const handleScenarioChange = (s: Scenario) => {
    setScenario(s);
    setConfirmResult(null);
  };

  return (
    <div className="drd-page" data-testid="document-replacement-demo">
      {/* Skip link target */}
      <a href="#demo-main" className="skip-link" tabIndex={0}>
        Skip to demo
      </a>

      {/* Back nav */}
      <nav className="drd-nav" aria-label="Breadcrumb">
        <Link to="/" className="drd-back-link">
          <ArrowLeft size={14} aria-hidden="true" />
          Home
        </Link>
        <span className="drd-nav-sep" aria-hidden="true">/</span>
        <span className="drd-nav-current" aria-current="page">
          Document Replacement Demo
        </span>
      </nav>

      {/* Page header */}
      <header className="drd-header">
        <div className="drd-header-icon" aria-hidden="true">
          <FileText size={28} />
        </div>
        <div>
          <h1 className="drd-title">Document Replacement — Version Diff</h1>
          <p className="drd-subtitle">
            Issue&nbsp;#449 · Replace a document with confidence by reviewing a
            side-by-side diff, choosing version retention, and setting the active
            version.
          </p>
        </div>
      </header>

      <main id="demo-main" tabIndex={-1} className="drd-main">
        {/* Scenario switcher */}
        <section className="drd-scenarios" aria-labelledby="scenarios-heading">
          <h2 id="scenarios-heading" className="drd-section-title">
            Demo scenarios
          </h2>
          <div className="drd-scenario-tabs" role="group" aria-label="Choose demo scenario">
            {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`drd-scenario-btn ${scenario === s ? 'drd-scenario-btn--active' : ''}`}
                onClick={() => handleScenarioChange(s)}
                aria-pressed={scenario === s}
                data-testid={`scenario-${s}`}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {/* Version history dropdown */}
        {scenario === 'standard' || scenario === 'preloaded' ? (
          <section className="drd-vhd-section" aria-labelledby="vhd-heading">
            <h2 id="vhd-heading" className="drd-section-title">
              Version history
            </h2>
            <div className="drd-vhd-wrapper">
              <VersionHistoryDropdown
                versions={ALL_VERSIONS}
                activeVersionId={activeVersionId}
                onVersionChange={setActiveVersionId}
                locale="en-US"
                data-testid="demo-version-history"
              />
            </div>
          </section>
        ) : null}

        {/* Confirmation result banner */}
        {confirmResult && (
          <div
            className="drd-result-banner"
            role="status"
            aria-live="polite"
            data-testid="confirm-result"
          >
            {confirmResult}
          </div>
        )}

        {/* Replacement flow */}
        <section aria-labelledby="flow-heading">
          <h2 id="flow-heading" className="drd-section-title">
            Replacement wizard
          </h2>

          <DocumentReplacementFlow
            key={scenario} // remount on scenario change to reset wizard state
            oldVersion={oldVersion}
            initialNewVersion={initialNewVersion}
            initialDiff={initialDiff}
            documentName={documentName}
            locale="en-US"
            onConfirm={({ newVersion, keepBoth, activeVersionId: avid }) => {
              const msg = keepBoth
                ? `✓ Both versions saved. Active: ${newVersion.versionLabel} (${avid})`
                : `✓ Replaced. Active: ${newVersion.versionLabel} (${avid})`;
              setConfirmResult(msg);
            }}
            onCancel={() => {
              setConfirmResult('Flow cancelled or completed — wizard reset.');
            }}
          />
        </section>
      </main>

      <style>{`
        .drd-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-xl) var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
          color: var(--text-main);
          font-family: inherit;
        }

        .drd-nav {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: var(--font-size-sm);
        }

        .drd-back-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--primary);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
        }

        .drd-back-link:hover {
          text-decoration: underline;
        }

        .drd-back-link:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
          border-radius: var(--radius-xs);
        }

        .drd-nav-sep {
          color: var(--text-muted);
        }

        .drd-nav-current {
          color: var(--text-muted);
        }

        .drd-header {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-md);
        }

        .drd-header-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border-radius: var(--radius-xl);
          background: rgba(59, 130, 246, 0.12);
          color: var(--primary);
          flex: 0 0 auto;
        }

        .drd-title {
          margin: 0;
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--text-main);
          line-height: var(--line-height-tight);
          letter-spacing: -0.02em;
        }

        .drd-subtitle {
          margin: 4px 0 0;
          font-size: var(--font-size-sm);
          color: var(--text-muted);
          line-height: var(--line-height-normal);
        }

        .drd-main {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
          outline: none;
        }

        .drd-section-title {
          margin: 0 0 var(--spacing-md);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        /* Scenario tabs */
        .drd-scenario-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .drd-scenario-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-full);
          border: 1px solid var(--glass-border-bright);
          background: var(--glass-bg);
          color: var(--text-muted);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .drd-scenario-btn:hover {
          border-color: var(--primary);
          color: var(--text-main);
        }

        .drd-scenario-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .drd-scenario-btn--active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }

        /* VHD section */
        .drd-vhd-wrapper {
          max-width: 640px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          backdrop-filter: var(--glass-blur);
        }

        /* Confirmation banner */
        .drd-result-banner {
          padding: var(--spacing-md) var(--spacing-lg);
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--radius-lg);
          color: #10b981;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }
      `}</style>
    </div>
  );
};

export default DocumentReplacementDemo;
