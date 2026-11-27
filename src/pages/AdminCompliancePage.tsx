import { useEffect, useMemo, useReducer, useState } from 'react';
import { AlertTriangle, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { ComplianceHoldBanner } from '../components/ComplianceHoldBanner';
import type { ComplianceHold } from '../components/ComplianceHoldBanner';
import { KycRejectionPanel } from '../components/KycRejectionPanel/KycRejectionPanel';
import type { KycStepId } from '../components/KycRejectionPanel/kycRejectionTaxonomy';
import { KycResubmissionTimeline } from '../components/KycResubmissionTimeline/KycResubmissionTimeline';
import { RemediationChecklist } from '../components/RemediationChecklist';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  complianceWorkflowReducer,
  loadComplianceWorkflowState,
  saveComplianceWorkflowState,
} from './complianceWorkflowState';

export function AdminCompliancePage() {
  useDocumentTitle('Compliance Workflow');
  const [initialWorkflow] = useState(loadComplianceWorkflowState);
  const [state, dispatch] = useReducer(complianceWorkflowReducer, initialWorkflow.state);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loadError] = useState(initialWorkflow.error);
  const [guidance, setGuidance] = useState('');

  useEffect(() => {
    try {
      saveComplianceWorkflowState(state);
      setStorageError(null);
    } catch {
      setStorageError('Your changes could not be saved in this browser. Keep this page open to retain them.');
    }
  }, [state]);

  const hold = useMemo<ComplianceHold>(() => {
    const pendingAppeal = state.holdStatus === 'appeal-pending';
    const resubmitted = state.holdStatus === 'resubmitted';
    return {
      id: 'identity-verification',
      type: 'kyc',
      severity: pendingAppeal || resubmitted ? 'warning' : 'blocking',
      title: pendingAppeal
        ? 'Identity verification appeal under review'
        : resubmitted
          ? 'Identity verification resubmission under review'
          : 'Identity verification requires remediation',
      message: pendingAppeal
        ? 'Your appeal has been received. The account hold remains in place while the compliance team reviews it.'
        : resubmitted
          ? 'Your corrected information has been submitted. The account hold remains in place until the review is complete.'
          : 'Review the rejection reasons below, complete the remediation checklist, or submit an appeal.',
      appealable: state.holdStatus === 'active',
    };
  }, [state.holdStatus]);

  const completedSteps = state.remediationSteps.filter((step) => step.completed).length;
  const canResubmit =
    state.remediationSteps.length > 0 &&
    completedSteps === state.remediationSteps.length &&
    state.resubmissions === 0;
  const timelineLabel =
    state.timeline.submissionType === 'appeal' ? 'appeal' : 'KYC resubmission';

  const handleAppeal = async (data: {
    reason: string;
    explanation: string;
    attachments: File[];
  }) => {
    dispatch({
      type: 'appeal-submitted',
      appeal: {
        reason: data.reason,
        explanation: data.explanation,
        attachmentNames: data.attachments.map((file) => file.name),
        submittedAt: new Date().toISOString(),
      },
    });
  };

  const handleNavigateToStep = (stepId: KycStepId) => {
    const targetStepId: Partial<Record<KycStepId, string>> = {
      'id-upload': 'government-id',
      'liveness-check': 'liveness-check',
      'address-proof': 'address-proof',
      'aml-screening': 'address-proof',
    };
    const target = targetStepId[stepId];
    const step = state.remediationSteps.find((item) => item.id === target);
    if (step) {
      setGuidance(`Continue with ${step.title} in the remediation checklist below.`);
      document.getElementById('remediation-checklist')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-24">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Admin review
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" aria-hidden="true" />
          Compliance workflow
        </h1>
        <p className="text-gray-400 max-w-3xl">
          Review the active account hold, respond to a KYC decision, and track appeals or corrected-document submissions in one place.
        </p>
      </header>

      {loadError && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200" role="alert">
          <AlertTriangle className="inline-block mr-2" size={18} aria-hidden="true" />
          {loadError}
        </p>
      )}
      {storageError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">
          <AlertTriangle className="inline-block mr-2" size={18} aria-hidden="true" />
          {storageError}
        </p>
      )}

      <section aria-labelledby="compliance-hold-heading" className="space-y-4">
        <div>
          <h2 id="compliance-hold-heading" className="text-xl font-semibold text-white">
            Active hold
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Appeal and remediation status are reflected here as soon as they are submitted.
          </p>
        </div>
        <ComplianceHoldBanner holds={[hold]} onAppeal={handleAppeal} />
      </section>

      {state.rejectionReasons.length > 0 && (
        <KycRejectionPanel
          reasons={state.rejectionReasons}
          onNavigateToStep={handleNavigateToStep}
        />
      )}

      <section aria-labelledby="remediation-heading" className="space-y-4">
        <div>
          <h2 id="remediation-heading" className="text-xl font-semibold text-white flex items-center gap-2">
            <ClipboardCheck size={21} aria-hidden="true" />
            KYC remediation
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Complete every corrective action to enable KYC resubmission.
          </p>
        </div>
        {guidance && (
          <p className="text-sm text-primary" role="status" aria-live="polite">
            {guidance}
          </p>
        )}
        <RemediationChecklist
          steps={state.remediationSteps.map((step) => ({
            ...step,
            actionLabel: step.completed ? undefined : 'Mark complete',
            disabled: state.resubmissions > 0,
            onAction: (stepId) =>
              dispatch({ type: 'remediation-step-toggled', stepId }),
          }))}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canResubmit}
            onClick={() =>
              dispatch({
                type: 'resubmission-submitted',
                submittedAt: new Date().toISOString(),
              })
            }
          >
            Submit corrected information
          </button>
          <p className="text-sm text-gray-400" role="status">
            {state.resubmissions > 0
              ? `Resubmission ${state.resubmissions} is awaiting review.`
              : `${completedSteps} of ${state.remediationSteps.length} remediation steps complete.`}
          </p>
        </div>
      </section>

      {state.timeline.submissionType && state.timeline.submittedAt && (
        <KycResubmissionTimeline
          status={state.timeline.status}
          submittedAt={state.timeline.submittedAt}
          slaBusinessDays={3}
          escalationHref="/support?topic=kyc-review"
          submissionKind={state.timeline.submissionType}
          title={`Your ${timelineLabel} progress`}
        />
      )}
    </div>
  );
}
