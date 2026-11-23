import React, { useId } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../Button';
import { DiffSummaryPanel } from './DiffSummaryPanel';
import type { DiffSummary, DocumentVersion } from './types';
import { VersionCard } from './VersionCard';

interface ReviewStepProps {
  oldVersion: DocumentVersion;
  newVersion: DocumentVersion;
  diff: DiffSummary;
  keepBoth: boolean;
  onToggleKeepBoth: () => void;
  activeVersionId: string;
  onSetActiveOld: () => void;
  onSetActiveNew: () => void;
  onBack: () => void;
  onNext: () => void;
  locale: string;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  oldVersion,
  newVersion,
  diff,
  keepBoth,
  onToggleKeepBoth,
  activeVersionId,
  onSetActiveOld,
  onSetActiveNew,
  onBack,
  onNext,
  locale,
}) => {
  const headingId = useId();

  return (
    <section className="drf-step-panel" aria-labelledby={headingId}>
      <div className="drf-step-heading">
        <h2 id={headingId}>Review changes</h2>
        <p className="drf-step-sub">
          Compare the previous and new versions, then choose which version will be marked as active.
        </p>
      </div>

      <div className="drf-version-compare">
        <VersionCard
          version={oldVersion}
          variant="old"
          locale={locale}
          isActive={activeVersionId === oldVersion.id}
          selectable
          onToggleActive={onSetActiveOld}
        />
        <div
          className="drf-vs-divider"
          aria-hidden="true"
        >
          <span className="drf-vs-badge">VS</span>
        </div>
        <VersionCard
          version={newVersion}
          variant="new"
          locale={locale}
          isActive={activeVersionId === newVersion.id}
          selectable
          onToggleActive={onSetActiveNew}
        />
      </div>

      <DiffSummaryPanel diff={diff} />

      <div className="drf-retention">
        <label className="drf-retention-switch">
          <input
            type="checkbox"
            checked={keepBoth}
            onChange={onToggleKeepBoth}
            aria-describedby="drf-retention-desc"
          />
          <span className="drf-retention-box" aria-hidden="true" />
          <span className="drf-retention-text">
            Keep both versions
            <span id="drf-retention-desc" className="drf-retention-sub">
              The previous version will remain available in the version history and the selected version will be labeled "Active".
            </span>
          </span>
        </label>

        {!keepBoth && (
          <div className="drf-retention-warn" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            If you proceed without keeping both versions, the previous version will be permanently replaced.
          </div>
        )}
      </div>

      <div className="drf-step-actions">
        <Button variant="secondary" onClick={onBack} type="button">
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </Button>
        <Button variant="primary" onClick={onNext} type="button">
          Continue to confirm
          <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
};
