/**
 * Document Replacement Flow — Issue #226
 *
 * A responsive, accessible wizard flow that gives users confidence
 * when replacing a document by presenting the old and new versions
 * side-by-side with metadata, a diff summary, and the ability to
 * keep both versions with a clearly labeled active version.
 *
 * Features:
 * - Three-step wizard: Upload → Review Diff → Confirm
 * - Side-by-side version comparison (stacked on mobile)
 * - File metadata: size, uploaded by, timestamp, type, hash
 * - Diff summary (lines/pages/bytes added, removed, changed)
 * - Toggle to keep both versions, with version labeling
 * - Active-version selector (radio) that marks which version is "Active"
 * - WCAG 2.1 AA: aria-live, focus management, visible focus, keyboard nav
 * - RTL-aware, responsive, reduced-motion, forced-colors
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { ConfirmStep } from './ConfirmStep';
import { ReviewStep } from './ReviewStep';
import { StepIndicator } from './StepIndicator';
import { SuccessStep } from './SuccessStep';
import type {
  DiffSummary,
  DocumentReplacementFlowProps,
  DocumentVersion,
  ReplacementStep,
} from './types';
import { UploadStep } from './UploadStep';
import { computeMockDiff } from './utils';
import '../DocumentReplacementFlow.css';

export const DocumentReplacementFlow: React.FC<DocumentReplacementFlowProps> = ({
  oldVersion,
  initialNewVersion = null,
  initialDiff = null,
  locale = 'en-US',
  documentName,
  onConfirm,
  onCancel,
  onFileSelected,
  onComputeDiff,
  className = '',
}) => {
  const [step, setStep] = useState<ReplacementStep>(
    initialNewVersion ? 'review' : 'upload',
  );
  const [newVersion, setNewVersion] = useState<DocumentVersion | null>(
    initialNewVersion ?? null,
  );
  const [diff, setDiff] = useState<DiffSummary | null>(initialDiff ?? null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [keepBoth, setKeepBoth] = useState(true);
  const [activeVersionId, setActiveVersionId] = useState<string>(
    initialNewVersion?.id ?? oldVersion.id,
  );
  const [confirming, setConfirming] = useState(false);

  const flowId = useId();

  const steps: Array<{ key: ReplacementStep; label: string }> = useMemo(
    () => [
      { key: 'upload', label: 'Upload' },
      { key: 'review', label: 'Review' },
      { key: 'confirm', label: 'Confirm' },
      { key: 'success', label: 'Done' },
    ],
    [],
  );

  // Compute the diff whenever we land on the review step without one
  useEffect(() => {
    if (step === 'review' && newVersion && !diff && !diffLoading) {
      setDiffLoading(true);
      void (async () => {
        try {
          const result = onComputeDiff
            ? await onComputeDiff(oldVersion, newVersion)
            : computeMockDiff(oldVersion, newVersion);
          setDiff(result);
        } catch (e) {
          setDiff(computeMockDiff(oldVersion, newVersion));
        } finally {
          setDiffLoading(false);
        }
      })();
    }
  }, [step, newVersion, diff, diffLoading, onComputeDiff, oldVersion]);

  const handleUploadNext = useCallback(
    (v: DocumentVersion) => {
      setNewVersion(v);
      setActiveVersionId(v.id);
      setDiff(null);
      setStep('review');
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!newVersion) return;
    setConfirming(true);
    try {
      onConfirm?.({
        newVersion,
        oldVersion,
        keepBoth,
        activeVersionId,
      });
      setStep('success');
    } finally {
      setConfirming(false);
    }
  }, [newVersion, oldVersion, keepBoth, activeVersionId, onConfirm]);

  return (
    <div
      className={`drf-root ${className}`}
      id={flowId}
      aria-label="Document replacement flow"
    >
      <StepIndicator steps={steps} current={step} />

      <div className="drf-content" aria-live="polite">
        {step === 'upload' && (
          <UploadStep
            oldVersion={oldVersion}
            onFileSelected={onFileSelected}
            onNext={handleUploadNext}
            onCancel={onCancel}
            locale={locale}
            preselected={initialNewVersion}
          />
        )}

        {step === 'review' && newVersion && (
          diffLoading ? (
            <div className="drf-loading" role="status" aria-live="polite">
              <div className="drf-loading-spinner" aria-hidden="true" />
              <p>Computing changes between versions…</p>
            </div>
          ) : diff ? (
            <ReviewStep
              oldVersion={oldVersion}
              newVersion={newVersion}
              diff={diff}
              keepBoth={keepBoth}
              onToggleKeepBoth={() => setKeepBoth((k) => !k)}
              activeVersionId={activeVersionId}
              onSetActiveOld={() => setActiveVersionId(oldVersion.id)}
              onSetActiveNew={() => setActiveVersionId(newVersion.id)}
              onBack={() => setStep('upload')}
              onNext={() => setStep('confirm')}
              locale={locale}
            />
          ) : null
        )}

        {step === 'confirm' && newVersion && diff && (
          <ConfirmStep
            oldVersion={oldVersion}
            newVersion={newVersion}
            diff={diff}
            keepBoth={keepBoth}
            activeVersionId={activeVersionId}
            documentName={documentName}
            onBack={() => setStep('review')}
            onConfirm={handleConfirm}
            locale={locale}
            isConfirming={confirming}
          />
        )}

        {step === 'success' && newVersion && (
          <SuccessStep
            oldVersion={oldVersion}
            newVersion={newVersion}
            keepBoth={keepBoth}
            activeVersionId={activeVersionId}
            documentName={documentName}
            locale={locale}
            onDone={onCancel}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentReplacementFlow;
