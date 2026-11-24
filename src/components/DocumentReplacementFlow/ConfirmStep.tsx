import React, { useId } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../Button';
import type { DiffSummary, DocumentVersion } from './types';
import { VersionCard } from './VersionCard';

interface ConfirmStepProps {
  oldVersion: DocumentVersion;
  newVersion: DocumentVersion;
  diff: DiffSummary;
  keepBoth: boolean;
  activeVersionId: string;
  documentName?: string;
  onBack: () => void;
  onConfirm: () => void;
  locale: string;
  isConfirming?: boolean;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  oldVersion,
  newVersion,
  diff,
  keepBoth,
  activeVersionId,
  documentName,
  onBack,
  onConfirm,
  locale,
  isConfirming,
}) => {
  const headingId = useId();
  const activeVersion =
    activeVersionId === newVersion.id ? newVersion : oldVersion;
  const inactiveVersion =
    activeVersionId === newVersion.id ? oldVersion : newVersion;

  return (
    <section className="drf-step-panel" aria-labelledby={headingId}>
      <div className="drf-step-heading">
        <h2 id={headingId}>Confirm replacement</h2>
        <p className="drf-step-sub">
          Please review the summary below before finalizing.
        </p>
      </div>

      <div className="drf-confirm-summary">
        {documentName && (
          <div className="drf-confirm-row">
            <span className="drf-confirm-key">Document</span>
            <span className="drf-confirm-value">{documentName}</span>
          </div>
        )}
        <div className="drf-confirm-row">
          <span className="drf-confirm-key">Active version</span>
          <span className="drf-confirm-value">
            <ShieldCheck size={14} aria-hidden="true" />
            {activeVersion.versionLabel} · {activeVersion.fileName}
          </span>
        </div>
        <div className="drf-confirm-row">
          <span className="drf-confirm-key">Version retention</span>
          <span className="drf-confirm-value">
            {keepBoth ? (
              <>
                <CheckCircle2 size={14} aria-hidden="true" />
                Keeping both versions.{' '}
                <span className="drf-confirm-muted">
                  {inactiveVersion.versionLabel} remains in history.
                </span>
              </>
            ) : (
              <>
                <RotateCcw size={14} aria-hidden="true" />
                Replacing previous version (previous will no longer be available).
              </>
            )}
          </span>
        </div>
        <div className="drf-confirm-row">
          <span className="drf-confirm-key">Summary of changes</span>
          <span className="drf-confirm-value">{diff.summaryText}</span>
        </div>
      </div>

      <div className="drf-confirm-compare">
        <VersionCard
          version={oldVersion}
          variant="old"
          locale={locale}
          isActive={activeVersionId === oldVersion.id}
          selectable={false}
        />
        <VersionCard
          version={newVersion}
          variant="new"
          locale={locale}
          isActive={activeVersionId === newVersion.id}
          selectable={false}
        />
      </div>

      <div className="drf-step-actions">
        <Button variant="secondary" onClick={onBack} type="button">
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          type="button"
          loading={isConfirming}
        >
          {keepBoth ? (
            <>Save both & set active</>
          ) : (
            <>Confirm replacement</>
          )}
        </Button>
      </div>
    </section>
  );
};
